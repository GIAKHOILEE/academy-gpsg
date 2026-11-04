import { throwAppException } from '@common/utils'
import { LearnType } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { HvmMeetRole, MeetingProvider } from '@enums/meeting.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { Repository } from 'typeorm'
import {
  academyIdentity,
  HVM_MEET_ROOM_SYNC_TTL_MS,
  LESSON_TIMEZONE_OFFSET_MINUTES,
  lessonExternalId,
  parseLessonExternalId,
} from '../hvm-meet.constants'
import { buildLessonSchedule, normalizeLessonDate } from '../hvm-meet.mapping'
import {
  DEFAULT_ROOM_POLICY,
  HvmMeetRoomPolicy,
  meetFactorOfMode,
  normalizeLessonMeetPolicy,
  resolveSections,
  toMeetSettings,
} from '../hvm-meet.policy'
import {
  HvmMeetCodeVerification,
  HvmMeetConnectionConfig,
  HvmMeetRosterEntry,
  HvmMeetSessionArchive,
  HvmMeetUpsertRoomRequest,
  LessonMeetingAttendanceResult,
  LessonMeetingJoinResult,
  LessonMeetingPublicLinkResult,
} from '../hvm-meet.types'
import { HvmMeetApiError, HvmMeetClientService, HvmMeetConnection } from './hvm-meet-client.service'
import { HvmMeetSettingService } from './hvm-meet-setting.service'
import { LessonMeetSessionService } from './lesson-meet-session.service'

/** Người dùng đã đăng nhập, đúng hình dạng req.user do JwtStrategy trả về. */
export interface MeetingUser {
  userId: number | string
  role: Role
}

/** Vai trò cán bộ học viện vào phòng với quyền điều hành phụ (cohost). */
const STAFF_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF]

/** Đồng bộ lại tối đa bấy nhiêu phòng sắp tới khi đổi cấu hình chung (gần nhất trước). */
export const HVM_MEET_RESYNC_MAX_ROOMS = 500

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (so sánh chuỗi được với normalizeLessonDate). */
export function vietnamToday(now: number = Date.now()): string {
  return new Date(now + LESSON_TIMEZONE_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Buổi học cần đẩy lại chính sách phòng: hôm nay trở đi theo giờ VN, hoặc chưa có ngày.
 * Gần nhất trước, buổi chưa có ngày sau cùng; tối đa `limit`.
 */
export function pickUpcomingLessonIds(
  lessons: { id: number; start_date?: string | null }[],
  today: string,
  limit = HVM_MEET_RESYNC_MAX_ROOMS,
): number[] {
  return lessons
    .map(lesson => ({ id: lesson.id, date: normalizeLessonDate(lesson.start_date) }))
    .filter(item => item.date === null || item.date >= today)
    .sort((a, b) => (a.date ?? '9999-99-99').localeCompare(b.date ?? '9999-99-99') || a.id - b.id)
    .slice(0, limit)
    .map(item => item.id)
}

/**
 * Quy tắc vai trò trong phòng của một buổi học:
 * - Giảng viên phụ trách lớp → host
 * - Admin / super admin / giáo vụ → cohost
 * - Học viên có trong lớp với hình thức học MEETING (học trực tuyến) → participant
 * - Còn lại → không được vào (null)
 *
 * Học viên chỉ có mặt trong `class_students` sau khi đơn ghi danh được duyệt (không còn PENDING),
 * đó cũng là điều kiện duy nhất mà các tính năng học online khác đang kiểm tra.
 */
export function decideMeetingRole(input: { role: Role; isClassTeacher: boolean; learnType: LearnType | null }): HvmMeetRole | null {
  const role = Number(input.role) as Role
  if (role === Role.TEACHER) return input.isClassTeacher ? HvmMeetRole.HOST : null
  if (STAFF_ROLES.includes(role)) return HvmMeetRole.COHOST
  if (role === Role.STUDENT) return input.learnType === LearnType.MEETING ? HvmMeetRole.PARTICIPANT : null
  return null
}

/**
 * Ai được xem lại các buổi HVM Meet đã diễn ra của một buổi học:
 * giảng viên phụ trách lớp, admin / giáo vụ, và MỌI học viên có trong lớp (kể cả học qua video
 * hay học tại lớp — xem lại chính là cách học viên học qua video theo kịp buổi trực tuyến).
 */
export function decideReplayAccess(input: { role: Role; isClassTeacher: boolean; learnType: LearnType | null }): boolean {
  const role = Number(input.role) as Role
  if (role === Role.TEACHER) return input.isClassTeacher
  if (STAFF_ROLES.includes(role)) return true
  if (role === Role.STUDENT) return input.learnType !== null
  return false
}

/**
 * Cột DATE của MySQL về tới đây có thể là chuỗi 'YYYY-MM-DD' hoặc Date lúc 00:00 giờ máy chủ (tuỳ
 * cấu hình driver) — đọc bằng giờ địa phương, KHÔNG dùng toISOString() (lệch về ngày hôm trước ở UTC+7).
 */
export function birthDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null
  if (Number.isNaN(value.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

/** Tên hiển thị trong phòng: "Tên thánh Họ tên", tối đa 120 ký tự theo hợp đồng HVM Meet. */
export function meetingDisplayName(user: Pick<User, 'full_name' | 'saint_name' | 'username'> | null | undefined, fallback: string): string {
  const name = [user?.saint_name, user?.full_name]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(' ')
  return (name || user?.username || fallback).slice(0, 120)
}

@Injectable()
export class LessonMeetingService {
  private readonly logger = new Logger(LessonMeetingService.name)

  /** Lần PUT phòng gần nhất theo externalId, để không gửi lại roster y hệt mỗi lần có người vào. */
  private readonly roomSyncCache = new Map<string, { hash: string; at: number }>()

  /** Chống chạy chồng resyncUpcomingRooms: lưu cấu hình 2 lần liên tiếp thì chạy thêm 1 lượt sau lượt đang chạy. */
  private resyncRunning: Promise<void> | null = null
  private resyncPending = false

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
    private readonly settingService: HvmMeetSettingService,
    private readonly client: HvmMeetClientService,
    private readonly sessionService: LessonMeetSessionService,
  ) {}

  /**
   * Cấp vé vào phòng HVM Meet của buổi học: kiểm quyền, đồng bộ phòng (lịch + danh sách lớp),
   * rồi xin vé. Vé dùng một lần và sống ~2 phút nên FE gọi ngay trước khi nhúng phòng.
   */
  async joinLesson(lessonId: number, user: MeetingUser): Promise<LessonMeetingJoinResult> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (lesson.meeting_provider !== MeetingProvider.HVM_MEET) {
      throwAppException('LESSON_MEETING_NOT_HVM', ErrorCode.LESSON_MEETING_NOT_HVM, HttpStatus.BAD_REQUEST, { reason: 'NOT_HVM_MEET' })
    }

    const config = await this.settingService.getActiveConfig()
    if (!config) {
      throwAppException('HVM_MEET_NOT_CONFIGURED', ErrorCode.HVM_MEET_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE, {
        reason: 'NOT_CONFIGURED',
      })
    }

    const userId = Number(user?.userId)
    const role = await this.resolveRole(lesson, user)
    if (!role) {
      throwAppException('LESSON_MEETING_FORBIDDEN', ErrorCode.LESSON_MEETING_FORBIDDEN, HttpStatus.FORBIDDEN, { reason: 'NOT_ALLOWED' })
    }

    const account = await this.userRepository.findOne({ where: { id: userId } })
    const externalId = lessonExternalId(lesson.id)
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    const roomRequest = await this.buildRoomRequest(lesson, config, await this.settingService.getStoredRoomPolicy())
    const ticketRequest = {
      identity: academyIdentity(userId),
      name: meetingDisplayName(account, `Người dùng ${userId}`),
      roleKey: role,
      externalUserId: String(userId),
      avatarUrl: account?.avatar && /^https?:\/\//i.test(account.avatar) ? account.avatar : undefined,
      metadata: { classId: lesson.class?.id, lessonId: lesson.id },
    }

    let ticket
    try {
      await this.syncRoom(conn, externalId, roomRequest)
      try {
        ticket = await this.client.createTicket(conn, externalId, ticketRequest)
      } catch (error) {
        // Phòng bị xoá / chưa có bên HVM Meet trong khi cache nghĩ là đã đồng bộ: tạo lại rồi xin vé lần nữa
        if (!(error instanceof HvmMeetApiError) || error.code !== 'ROOM_NOT_FOUND') throw error
        await this.syncRoom(conn, externalId, roomRequest, true)
        ticket = await this.client.createTicket(conn, externalId, ticketRequest)
      }
    } catch (error) {
      this.client.rethrowAsAppException(error)
    }

    return {
      joinUrl: ticket.joinUrl,
      expiresAt: ticket.expiresAt,
      role,
      externalId,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        class_id: lesson.class?.id,
        class_name: lesson.class?.name || null,
      },
    }
  }

  /** Vai trò của người dùng trong phòng buổi học này, null = không được vào. */
  async resolveRole(lesson: Lesson, user: MeetingUser): Promise<HvmMeetRole | null> {
    const context = await this.loadAccessContext(lesson, user)
    return context ? decideMeetingRole(context) : null
  }

  /** Danh sách dự kiến tham gia: giảng viên (host) + học viên học trực tuyến của lớp (participant). */
  async buildRoster(lesson: Lesson): Promise<HvmMeetRosterEntry[]> {
    const roster: HvmMeetRosterEntry[] = []
    if (!lesson.class) return roster

    if (lesson.class.teacher_id) {
      const teacher = await this.teacherRepository.findOne({ where: { id: lesson.class.teacher_id }, relations: ['user'] })
      if (teacher?.user) {
        roster.push({
          identity: academyIdentity(teacher.user.id),
          name: meetingDisplayName(teacher.user, `Giảng viên ${teacher.user.id}`),
          roleKey: HvmMeetRole.HOST,
          externalUserId: String(teacher.user.id),
        })
      }
    }

    const classStudents = await this.classStudentRepository.find({
      where: { class_id: lesson.class.id, learn_type: LearnType.MEETING },
      relations: ['student', 'student.user'],
    })
    for (const classStudent of classStudents) {
      const account = classStudent.student?.user
      if (!account) continue
      roster.push({
        identity: academyIdentity(account.id),
        name: meetingDisplayName(account, `Học viên ${account.id}`),
        roleKey: HvmMeetRole.PARTICIPANT,
        externalUserId: String(account.id),
      })
    }
    return roster
  }

  /* ----------------------- Đồng bộ phòng chủ động ----------------------- */

  /**
   * Tạo / cập nhật phòng HVM Meet của buổi học ngay (lịch, roster, chính sách vào phòng + điểm danh),
   * không chờ ai bấm vào phòng. Gọi sau khi lưu buổi học. Không bao giờ ném lỗi ra ngoài: lưu buổi
   * học không được hỏng vì HVM Meet. Trả true nếu đã đẩy sang meet.
   */
  async syncLessonRoom(lessonId: number): Promise<boolean> {
    try {
      const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
      if (!lesson || lesson.meeting_provider !== MeetingProvider.HVM_MEET) return false
      const config = await this.settingService.getActiveConfig()
      if (!config) return false
      await this.pushRoom(lesson, config, await this.settingService.getStoredRoomPolicy(), true)
      return true
    } catch (error: any) {
      this.logger.error(`Không đồng bộ được phòng HVM Meet của buổi học ${lessonId}: ${error?.message}`)
      return false
    }
  }

  /**
   * Đẩy lại chính sách phòng cho các buổi HVM Meet từ hôm nay trở đi (giờ VN) hoặc chưa có ngày,
   * sau khi đổi cấu hình chung. Tuần tự, tối đa HVM_MEET_RESYNC_MAX_ROOMS phòng. Không ném lỗi.
   */
  async resyncUpcomingRooms(): Promise<void> {
    if (this.resyncRunning) {
      this.resyncPending = true
      return this.resyncRunning
    }
    this.resyncRunning = (async () => {
      try {
        do {
          this.resyncPending = false
          await this.resyncUpcomingRoomsOnce()
        } while (this.resyncPending)
      } finally {
        this.resyncRunning = null
      }
    })()
    return this.resyncRunning
  }

  private async resyncUpcomingRoomsOnce(): Promise<void> {
    try {
      const config = await this.settingService.getActiveConfig()
      if (!config) return
      const globalPolicy = await this.settingService.getStoredRoomPolicy()

      const lessons = await this.lessonRepository.find({
        where: { meeting_provider: MeetingProvider.HVM_MEET },
        select: { id: true, start_date: true },
      })
      const ids = pickUpcomingLessonIds(lessons, vietnamToday())

      let synced = 0
      let failed = 0
      for (const id of ids) {
        try {
          const lesson = await this.lessonRepository.findOne({ where: { id }, relations: ['class'] })
          if (!lesson || lesson.meeting_provider !== MeetingProvider.HVM_MEET) continue
          await this.pushRoom(lesson, config, globalPolicy, true)
          synced++
        } catch (error: any) {
          failed++
          this.logger.error(`Không đồng bộ được phòng HVM Meet của buổi học ${id}: ${error?.message}`)
        }
      }
      this.logger.log(
        `Đồng bộ chính sách phòng HVM Meet: ${synced} phòng thành công, ${failed} lỗi ` +
          `(${ids.length}/${lessons.length} buổi HVM Meet là buổi sắp tới, tối đa ${HVM_MEET_RESYNC_MAX_ROOMS})`,
      )
    } catch (error: any) {
      this.logger.error(`Đồng bộ chính sách phòng HVM Meet thất bại: ${error?.message}`)
    }
  }

  /* --------------------------- Link công khai --------------------------- */

  /**
   * Link /p/ của phòng buổi học. Admin / giáo vụ hoặc giảng viên của lớp xem được; chỉ admin / giáo vụ
   * đổi được link. Đồng bộ phòng trước để phòng tồn tại với chính sách hiện tại.
   */
  async getPublicLink(lessonId: number, user: MeetingUser, rotate = false): Promise<LessonMeetingPublicLinkResult> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (lesson.meeting_provider !== MeetingProvider.HVM_MEET) {
      throwAppException('LESSON_MEETING_NOT_HVM', ErrorCode.LESSON_MEETING_NOT_HVM, HttpStatus.BAD_REQUEST, { reason: 'NOT_HVM_MEET' })
    }
    const isStaff = await this.assertStaffOrClassTeacher(lesson, user)
    if (rotate && !isStaff) {
      throwAppException('LESSON_MEETING_FORBIDDEN', ErrorCode.LESSON_MEETING_FORBIDDEN, HttpStatus.FORBIDDEN, { reason: 'NOT_ALLOWED' })
    }
    const config = await this.requireActiveConfig()
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    const globalPolicy = await this.settingService.getStoredRoomPolicy()
    const externalId = lessonExternalId(lesson.id)
    const accessMode = resolveSections(globalPolicy, normalizeLessonMeetPolicy(lesson.meet_policy)).access?.mode ?? DEFAULT_ROOM_POLICY.access.mode

    try {
      await this.pushRoom(lesson, config, globalPolicy, true)
      const link = await this.client.getPublicLink(conn, externalId, rotate)
      if (rotate) this.logger.log(`Đổi link công khai phòng ${externalId} (user ${user?.userId})`)
      return {
        url: link.url,
        enabled: Boolean(link.enabled),
        factor: link.factor ?? meetFactorOfMode(accessMode),
        verify_configured: Boolean(link.verifyConfigured),
        access_mode: accessMode,
      }
    } catch (error) {
      this.client.rethrowAsAppException(error)
    }
  }

  /* ------------------------ Điểm danh từng buổi ------------------------ */

  /**
   * Báo cáo điểm danh HVM Meet của một buổi (admin / giáo vụ, giảng viên của lớp), kèm
   * `academySynced` = đã ghi vào sổ điểm danh lớp (webhook attendance.finalized) chưa.
   */
  async getSessionAttendance(lessonId: number, sessionId: string, user: MeetingUser): Promise<LessonMeetingAttendanceResult> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.assertStaffOrClassTeacher(lesson, user)
    const config = await this.requireActiveConfig()
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    await this.assertSessionOfLesson(conn, lesson.id, sessionId)

    try {
      const summary = await this.client.getAttendance(conn, sessionId)
      const row = await this.sessionService.findForLesson(lesson.id, sessionId)
      return {
        ...summary,
        sessionId: summary?.sessionId ?? sessionId,
        finalized: Boolean(summary?.finalized),
        reports: Array.isArray(summary?.reports) ? summary.reports : [],
        academySynced: Boolean(row?.attendance_finalized),
      }
    } catch (error) {
      this.client.rethrowAsAppException(error)
    }
  }

  /* --------------------------- Xem lại buổi học --------------------------- */

  /**
   * Các lần phòng HVM Meet của buổi học đã diễn ra (mới nhất trước). Đồng bộ bù từ HVM Meet
   * nếu tích hợp đang bật, phòng khi webhook bị lỡ.
   */
  async listSessions(lessonId: number, user: MeetingUser) {
    const lesson = await this.findLessonForReplay(lessonId, user)

    const config = await this.settingService.getActiveConfig()
    if (config) await this.sessionService.syncFromHvmMeet({ baseUrl: config.base_url, apiKey: config.api_key }, lesson.id)

    const sessions = await this.sessionService.listByLesson(lesson.id)
    return sessions.map(session => this.sessionService.toResponse(session))
  }

  /**
   * Vé xem lại (một lần, ngắn hạn) cho trang replay của HVM Meet: video đồng bộ với trò chuyện,
   * cảm xúc, giơ tay, chia sẻ màn hình, bình chọn, điểm danh giữa buổi. FE nhúng `url` bằng iframe.
   */
  async createReplay(lessonId: number, sessionId: string, user: MeetingUser): Promise<{ url: string; expiresAt: string }> {
    const lesson = await this.findLessonForReplay(lessonId, user)
    const config = await this.requireActiveConfig()
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    await this.assertSessionOfLesson(conn, lesson.id, sessionId)

    const userId = Number(user?.userId)
    const account = await this.userRepository.findOne({ where: { id: userId } })
    try {
      const ticket = await this.client.createReplayTicket(conn, sessionId, {
        identity: academyIdentity(userId),
        name: meetingDisplayName(account, `Người dùng ${userId}`),
      })
      return { url: ticket.joinUrl, expiresAt: ticket.expiresAt }
    } catch (error) {
      this.client.rethrowAsAppException(error)
    }
  }

  /** Biên bản đầy đủ của buổi (chỉ admin / giáo vụ): trò chuyện, sự kiện, bình chọn, điểm danh, bản ghi. */
  async getArchive(lessonId: number, sessionId: string, user: MeetingUser): Promise<HvmMeetSessionArchive> {
    if (!STAFF_ROLES.includes(Number(user?.role) as Role)) {
      throwAppException('LESSON_MEETING_FORBIDDEN', ErrorCode.LESSON_MEETING_FORBIDDEN, HttpStatus.FORBIDDEN, { reason: 'NOT_ALLOWED' })
    }
    const lesson = await this.findLessonForReplay(lessonId, user)
    const config = await this.requireActiveConfig()
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    await this.assertSessionOfLesson(conn, lesson.id, sessionId)

    try {
      return await this.client.getArchive(conn, sessionId)
    } catch (error) {
      this.client.rethrowAsAppException(error)
    }
  }

  /* ------------------------------ private ------------------------------ */

  private async findLessonForReplay(lessonId: number, user: MeetingUser): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const context = await this.loadAccessContext(lesson, user)
    if (!context || !decideReplayAccess(context)) {
      throwAppException('LESSON_MEETING_FORBIDDEN', ErrorCode.LESSON_MEETING_FORBIDDEN, HttpStatus.FORBIDDEN, { reason: 'NOT_ALLOWED' })
    }
    return lesson
  }

  /** Admin / giáo vụ → true; giảng viên của lớp → false; người khác → 403. */
  private async assertStaffOrClassTeacher(lesson: Lesson, user: MeetingUser): Promise<boolean> {
    if (STAFF_ROLES.includes(Number(user?.role) as Role)) return true
    const context = await this.loadAccessContext(lesson, user)
    if (context?.role === Role.TEACHER && context.isClassTeacher) return false
    throwAppException('LESSON_MEETING_FORBIDDEN', ErrorCode.LESSON_MEETING_FORBIDDEN, HttpStatus.FORBIDDEN, { reason: 'NOT_ALLOWED' })
  }

  private async requireActiveConfig(): Promise<HvmMeetConnectionConfig> {
    const config = await this.settingService.getActiveConfig()
    if (!config) {
      throwAppException('HVM_MEET_NOT_CONFIGURED', ErrorCode.HVM_MEET_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE, {
        reason: 'NOT_CONFIGURED',
      })
    }
    return config
  }

  /**
   * sessionId phải thuộc đúng buổi học trong URL — nếu không, ai có quyền ở lớp này cũng xem
   * được buổi của lớp khác chỉ bằng cách đổi sessionId. Chưa có trong sổ thì đồng bộ bù rồi xét lại.
   */
  private async assertSessionOfLesson(conn: HvmMeetConnection, lessonId: number, sessionId: string) {
    if (await this.sessionService.findForLesson(lessonId, sessionId)) return
    await this.sessionService.syncFromHvmMeet(conn, lessonId, true)
    if (await this.sessionService.findForLesson(lessonId, sessionId)) return
    throwAppException('LESSON_MEETING_SESSION_NOT_FOUND', ErrorCode.LESSON_MEETING_SESSION_NOT_FOUND, HttpStatus.NOT_FOUND, {
      reason: 'SESSION_NOT_FOUND',
    })
  }

  /**
   * HVM Meet hỏi khi có người vào bằng LINK CÔNG KHAI và gõ mã học viên (`user.code`).
   * Trả về danh tính GIỐNG HỆT lúc vào qua học viện (academy:user:<id>) để điểm danh/roster
   * khớp, và cùng quy tắc vai trò với joinLesson. Không ném lỗi: meet cần lý do để báo cho
   * người gõ (mã sai / không thuộc lớp / tài khoản bị khoá).
   *
   * Phòng của buổi học (lesson-<id>): chỉ người có quyền vào buổi đó. Phòng khác (họp chung
   * do học viện tạo): mọi tài khoản đang hoạt động, cán bộ là cohost.
   */
  async verifyJoinCode(
    roomExternalId: string,
    rawCode: string,
    factor: { kind?: string; birthDate?: string } = {},
  ): Promise<HvmMeetCodeVerification> {
    const code = String(rawCode ?? '').trim()
    if (!code || code.length > 64) return { ok: false, reason: 'NOT_FOUND' }

    const user = await this.userRepository.findOne({ where: { code } })
    if (!user) return { ok: false, reason: 'NOT_FOUND' }
    // Xác thực thêm bằng ngày sinh (meet chọn theo setting room.publicJoinFactor): mã học viên đánh
    // số liên tục và là mật khẩu mặc định nên một mình nó không đủ. Kiểm TRƯỚC trạng thái tài khoản
    // để người không biết ngày sinh không dò được tài khoản nào đang bị khoá.
    if (factor.kind === 'birthdate') {
      const stored = birthDateString(user.birth_date)
      if (!stored) return { ok: false, reason: 'NO_SECOND_FACTOR' }
      if (stored !== String(factor.birthDate ?? '').trim()) return { ok: false, reason: 'SECOND_FACTOR_MISMATCH' }
    }
    if (Number(user.status) !== UserStatus.ACTIVE) return { ok: false, reason: 'INACTIVE' }

    const identity = {
      identity: academyIdentity(user.id),
      externalUserId: String(user.id),
      name: meetingDisplayName(user, code),
    }

    const lessonId = parseLessonExternalId(roomExternalId)
    if (lessonId === null) {
      const role = STAFF_ROLES.includes(Number(user.role) as Role) ? HvmMeetRole.COHOST : HvmMeetRole.PARTICIPANT
      return { ok: true, ...identity, roleKey: role }
    }

    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class'] })
    if (!lesson) return { ok: false, reason: 'NOT_ALLOWED' }
    const context = await this.loadAccessContext(lesson, { userId: user.id, role: user.role })
    const role = context ? decideMeetingRole(context) : null
    return role ? { ok: true, ...identity, roleKey: role } : { ok: false, reason: 'NOT_ALLOWED' }
  }

  /** Dữ kiện để quyết định quyền: vai trò, có phải giảng viên của lớp, hình thức học trong lớp. */
  private async loadAccessContext(
    lesson: Lesson,
    user: MeetingUser,
  ): Promise<{ role: Role; isClassTeacher: boolean; learnType: LearnType | null } | null> {
    const userId = Number(user?.userId)
    const role = Number(user?.role) as Role
    if (!Number.isFinite(userId) || !lesson.class) return null

    let isClassTeacher = false
    let learnType: LearnType | null = null

    if (role === Role.TEACHER) {
      const teacher = await this.teacherRepository.findOne({ where: { user_id: userId } })
      isClassTeacher = Boolean(teacher && lesson.class.teacher_id && teacher.id === lesson.class.teacher_id)
    } else if (role === Role.STUDENT) {
      const student = await this.studentRepository.findOne({ where: { user_id: userId } })
      if (student) {
        const classStudent = await this.classStudentRepository.findOne({ where: { class_id: lesson.class.id, student_id: student.id } })
        learnType = classStudent ? Number(classStudent.learn_type) : null
      }
    }

    return { role, isClassTeacher, learnType }
  }

  /** Dựng body rồi PUT phòng của buổi học. */
  private async pushRoom(lesson: Lesson, config: HvmMeetConnectionConfig, globalPolicy: HvmMeetRoomPolicy | null, force: boolean) {
    const conn: HvmMeetConnection = { baseUrl: config.base_url, apiKey: config.api_key }
    await this.syncRoom(conn, lessonExternalId(lesson.id), await this.buildRoomRequest(lesson, config, globalPolicy), force)
  }

  /**
   * Body PUT phòng: lịch, tiêu đề, roster, metadata và setting cấp phòng do academy quản lý
   * (luôn đủ MANAGED_MEET_KEYS; null = về giá trị kế thừa của meet).
   */
  async buildRoomRequest(lesson: Lesson, config: HvmMeetConnectionConfig, globalPolicy: HvmMeetRoomPolicy | null): Promise<HvmMeetUpsertRoomRequest> {
    const { scheduledStart, scheduledEnd } = buildLessonSchedule(lesson)
    const className = lesson.class?.name?.trim()
    const title = (className ? `${className} — ${lesson.title}` : lesson.title || `Buổi học ${lesson.id}`).slice(0, 300)

    return {
      title,
      templateKey: config.default_template_key,
      scheduledStart,
      scheduledEnd,
      metadata: { classId: lesson.class?.id, lessonId: lesson.id },
      settings: toMeetSettings(resolveSections(globalPolicy, normalizeLessonMeetPolicy(lesson.meet_policy))),
      roster: await this.buildRoster(lesson),
    }
  }

  /**
   * PUT phòng (idempotent). Bỏ qua nếu nội dung y hệt lần gửi gần nhất và chưa quá 10 phút.
   *
   * Fail-safe: meet trả 422 SETTINGS_INVALID (meet cũ chưa biết key mới, hoặc giá trị bị từ chối) thì
   * ghi log rồi gửi lại KHÔNG kèm settings — lớp học không bao giờ bị chặn vì chính sách; mặc định
   * của meet là trạng thái đóng hơn (publicJoin tắt).
   */
  async syncRoom(conn: HvmMeetConnection, externalId: string, body: HvmMeetUpsertRoomRequest, force = false) {
    const cacheKey = `${conn.baseUrl}|${externalId}`
    const hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
    const cached = this.roomSyncCache.get(cacheKey)
    const now = Date.now()
    if (!force && cached && cached.hash === hash && now - cached.at < HVM_MEET_ROOM_SYNC_TTL_MS) return

    try {
      await this.client.upsertRoom(conn, externalId, body)
    } catch (error) {
      if (!(error instanceof HvmMeetApiError) || error.status !== 422 || error.code !== 'SETTINGS_INVALID' || !body.settings) throw error
      this.logger.error(
        `HVM Meet từ chối setting của phòng ${externalId} (${error.message}` +
          `${error.details ? ` ${JSON.stringify(error.details)}` : ''}). Gửi lại không kèm setting: chính sách vào phòng / ` +
          'điểm danh của academy CHƯA được áp dụng. Kiểm tra phiên bản HVM Meet và các key bị khoá trong trang quản trị meet.',
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { settings, ...withoutSettings } = body
      await this.client.upsertRoom(conn, externalId, withoutSettings)
    }
    this.roomSyncCache.set(cacheKey, { hash, at: now })
    if (this.roomSyncCache.size > 1000) this.roomSyncCache.delete(this.roomSyncCache.keys().next().value)
  }
}
