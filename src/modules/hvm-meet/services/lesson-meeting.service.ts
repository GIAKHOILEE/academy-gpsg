import { throwAppException } from '@common/utils'
import { LearnType } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { HvmMeetRole, MeetingProvider } from '@enums/meeting.enum'
import { Role } from '@enums/role.enum'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { Repository } from 'typeorm'
import { academyIdentity, HVM_MEET_ROOM_SYNC_TTL_MS, lessonExternalId } from '../hvm-meet.constants'
import { buildLessonSchedule } from '../hvm-meet.mapping'
import {
  HvmMeetConnectionConfig,
  HvmMeetRosterEntry,
  HvmMeetSessionArchive,
  HvmMeetUpsertRoomRequest,
  LessonMeetingJoinResult,
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
  /** Lần PUT phòng gần nhất theo externalId, để không gửi lại roster y hệt mỗi lần có người vào. */
  private readonly roomSyncCache = new Map<string, { hash: string; at: number }>()

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
    const roomRequest = await this.buildRoomRequest(lesson, config)
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

  private async buildRoomRequest(lesson: Lesson, config: HvmMeetConnectionConfig): Promise<HvmMeetUpsertRoomRequest> {
    const { scheduledStart, scheduledEnd } = buildLessonSchedule(lesson)
    const className = lesson.class?.name?.trim()
    const title = (className ? `${className} — ${lesson.title}` : lesson.title || `Buổi học ${lesson.id}`).slice(0, 300)

    return {
      title,
      templateKey: config.default_template_key,
      scheduledStart,
      scheduledEnd,
      metadata: { classId: lesson.class?.id, lessonId: lesson.id },
      roster: await this.buildRoster(lesson),
    }
  }

  /** PUT phòng (idempotent). Bỏ qua nếu nội dung y hệt lần gửi gần nhất và chưa quá 10 phút. */
  private async syncRoom(conn: HvmMeetConnection, externalId: string, body: HvmMeetUpsertRoomRequest, force = false) {
    const cacheKey = `${conn.baseUrl}|${externalId}`
    const hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
    const cached = this.roomSyncCache.get(cacheKey)
    const now = Date.now()
    if (!force && cached && cached.hash === hash && now - cached.at < HVM_MEET_ROOM_SYNC_TTL_MS) return

    await this.client.upsertRoom(conn, externalId, body)
    this.roomSyncCache.set(cacheKey, { hash, at: now })
    if (this.roomSyncCache.size > 1000) this.roomSyncCache.delete(this.roomSyncCache.keys().next().value)
  }
}
