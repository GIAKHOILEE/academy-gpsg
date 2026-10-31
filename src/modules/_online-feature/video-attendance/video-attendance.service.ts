import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { In, IsNull, Repository } from 'typeorm'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { AttendanceStatus } from '@enums/class.enum'
import { Role } from '@enums/role.enum'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Lesson } from '../lesson/lesson.entity'
import { LessonVideoProgress } from '../lesson/lesson-video-progress.entity'
import { AnswerVideoCheckDto, UpdateVideoProgressDto } from '../lesson/dtos/update-video-progress.dto'
import { ClassVideoAttendanceConfig } from './entities/class-video-attendance-config.entity'
import { VideoAttendanceQuestion } from './entities/video-attendance-question.entity'
import { UpdateVideoAttendanceConfigDto } from './dtos/video-attendance-config.dto'
import { CreateVideoAttendanceQuestionDto, UpdateVideoAttendanceQuestionDto } from './dtos/video-attendance-question.dto'
import {
  BlockReason,
  CHECK_GRACE_SECONDS,
  DEFAULT_SETTINGS,
  IdleCheckMode,
  MultiVideoRule,
  QuestionType,
  Range,
  VideoAttendanceMode,
  VideoAttendanceSettings,
  creditRanges,
  isAnswerCorrect,
  isLessonComplete,
  isTrackableVideoUrl,
  isVideoComplete,
  legacyDeltaToRanges,
  maxEnd,
  nextCheckAfterSeconds,
  normalizeRanges,
  parseLearnTypes,
  percentOf,
  rangesLength,
  resolveAttendanceTarget,
  subtractRanges,
  todayInVietnam,
  unionRanges,
  upgradeAttendanceStatus,
  videoKeyOf,
} from './video-attendance.logic'

const CONFIRM_QUESTION_TEXT = 'Bạn còn đang theo dõi bài giảng không? Bấm xác nhận để tiếp tục được tính thời gian học.'
const AUTO_NOTE = 'Điểm danh tự động qua video'

export type CheckResult = 'PASSED' | 'WRONG_RETRY' | 'WRONG' | 'TIMEOUT' | 'STALE'

type ActiveCheck = {
  id: string
  question_id: number | null
  issued_at: string
  expires_at: string
  attempts: number
}

type StudentContext = {
  student: Student
  lesson: Lesson
  classStudent: ClassStudents | null
  settings: VideoAttendanceSettings
}

@Injectable()
export class VideoAttendanceService {
  /** Khoá theo (học viên, buổi) để hai tab gửi cùng lúc không ghi đè nhau (API chạy 1 tiến trình). */
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(
    @InjectRepository(ClassVideoAttendanceConfig)
    private readonly configRepository: Repository<ClassVideoAttendanceConfig>,
    @InjectRepository(VideoAttendanceQuestion)
    private readonly questionRepository: Repository<VideoAttendanceQuestion>,
    @InjectRepository(LessonVideoProgress)
    private readonly progressRepository: Repository<LessonVideoProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  // ------------------------------------------------------------------ cấu hình

  toSettings(row: ClassVideoAttendanceConfig | null | undefined): VideoAttendanceSettings {
    if (!row) return { ...DEFAULT_SETTINGS, eligible_learn_types: [...DEFAULT_SETTINGS.eligible_learn_types] }
    return {
      enabled: !!row.enabled,
      mode: row.mode === VideoAttendanceMode.ANY_VIEW ? VideoAttendanceMode.ANY_VIEW : VideoAttendanceMode.PERCENT,
      required_percent: Number(row.required_percent) || DEFAULT_SETTINGS.required_percent,
      min_view_seconds: Number(row.min_view_seconds) || DEFAULT_SETTINGS.min_view_seconds,
      multi_video_rule: row.multi_video_rule === MultiVideoRule.ALL ? MultiVideoRule.ALL : MultiVideoRule.ANY,
      block_seek_forward: !!row.block_seek_forward,
      max_playback_rate: Number(row.max_playback_rate) || DEFAULT_SETTINGS.max_playback_rate,
      pause_when_hidden: !!row.pause_when_hidden,
      eligible_learn_types: parseLearnTypes(row.eligible_learn_types),
      late_after_days: row.late_after_days ?? null,
      deadline_days: row.deadline_days ?? null,
      idle_check_enabled: !!row.idle_check_enabled,
      idle_check_mode: row.idle_check_mode === IdleCheckMode.CONFIRM ? IdleCheckMode.CONFIRM : IdleCheckMode.QUESTION,
      idle_check_interval_minutes: Number(row.idle_check_interval_minutes) || DEFAULT_SETTINGS.idle_check_interval_minutes,
      idle_check_timeout_seconds: Number(row.idle_check_timeout_seconds) || DEFAULT_SETTINGS.idle_check_timeout_seconds,
      idle_check_max_attempts: Number(row.idle_check_max_attempts) || DEFAULT_SETTINGS.idle_check_max_attempts,
      idle_check_discard_on_fail: !!row.idle_check_discard_on_fail,
    }
  }

  async getSettings(classId: number): Promise<VideoAttendanceSettings> {
    return this.toSettings(await this.configRepository.findOne({ where: { class_id: classId } }))
  }

  async getConfig(classId: number) {
    await this.findClassOrThrow(classId)
    const row = await this.configRepository.findOne({ where: { class_id: classId } })
    const questionCount = await this.questionRepository.count({ where: { class_id: classId, is_active: true } })
    return {
      class_id: classId,
      ...this.toSettings(row),
      is_default: !row,
      active_question_count: questionCount,
      updated_at: row?.updated_at ?? null,
    }
  }

  async updateConfig(classId: number, dto: UpdateVideoAttendanceConfigDto, userId?: number) {
    await this.findClassOrThrow(classId)
    let row = await this.configRepository.findOne({ where: { class_id: classId } })
    if (!row) {
      const d = DEFAULT_SETTINGS
      row = this.configRepository.create({
        class_id: classId,
        enabled: d.enabled,
        mode: d.mode,
        required_percent: d.required_percent,
        min_view_seconds: d.min_view_seconds,
        multi_video_rule: d.multi_video_rule,
        block_seek_forward: d.block_seek_forward,
        max_playback_rate: d.max_playback_rate,
        pause_when_hidden: d.pause_when_hidden,
        eligible_learn_types: d.eligible_learn_types.join(','),
        late_after_days: d.late_after_days,
        deadline_days: d.deadline_days,
        idle_check_enabled: d.idle_check_enabled,
        idle_check_mode: d.idle_check_mode,
        idle_check_interval_minutes: d.idle_check_interval_minutes,
        idle_check_timeout_seconds: d.idle_check_timeout_seconds,
        idle_check_max_attempts: d.idle_check_max_attempts,
        idle_check_discard_on_fail: d.idle_check_discard_on_fail,
      })
    }
    const { eligible_learn_types, ...rest } = dto
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) (row as any)[key] = value
    }
    if (eligible_learn_types !== undefined) {
      row.eligible_learn_types = [...new Set(eligible_learn_types)].sort().join(',')
    }
    if (row.late_after_days !== null && row.deadline_days !== null && row.late_after_days > row.deadline_days) {
      throwAppException('VIDEO_ATTENDANCE_LATE_AFTER_DEADLINE', ErrorCode.VIDEO_ATTENDANCE_LATE_AFTER_DEADLINE, HttpStatus.BAD_REQUEST)
    }
    row.updated_by_user_id = userId ?? null
    await this.configRepository.save(row)
    return this.getConfig(classId)
  }

  // ------------------------------------------------------------------ quyền

  private async findClassOrThrow(classId: number): Promise<Classes> {
    const cls = await this.classRepository.findOne({ where: { id: classId }, select: ['id', 'teacher_id', 'name'] })
    if (!cls) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    return cls
  }

  /** Giảng viên chỉ được sửa lớp mình dạy; admin/staff/super admin sửa mọi lớp. */
  async assertCanManageClass(classId: number, user: { userId: number; role: Role }): Promise<void> {
    const cls = await this.findClassOrThrow(classId)
    if (user.role !== Role.TEACHER) return
    const teacher = await this.teacherRepository.findOne({ where: { user_id: user.userId }, select: ['id'] })
    if (!teacher || cls.teacher_id !== teacher.id) {
      throwAppException('VIDEO_ATTENDANCE_NOT_CLASS_TEACHER', ErrorCode.VIDEO_ATTENDANCE_NOT_CLASS_TEACHER, HttpStatus.FORBIDDEN)
    }
  }

  // ------------------------------------------------------------------ câu hỏi

  async listQuestions(classId: number, lessonId?: number) {
    await this.findClassOrThrow(classId)
    const where: any = { class_id: classId }
    if (lessonId) where.lesson_id = lessonId
    return this.questionRepository.find({ where, order: { lesson_id: 'ASC', id: 'ASC' } })
  }

  async createQuestion(classId: number, dto: CreateVideoAttendanceQuestionDto, userId?: number) {
    await this.findClassOrThrow(classId)
    const row = this.questionRepository.create({ class_id: classId, created_by_user_id: userId ?? null, is_active: true })
    await this.applyQuestion(row, dto, classId)
    return this.questionRepository.save(row)
  }

  async updateQuestion(classId: number, id: number, dto: UpdateVideoAttendanceQuestionDto) {
    const row = await this.questionRepository.findOne({ where: { id, class_id: classId } })
    if (!row) throwAppException('VIDEO_ATTENDANCE_QUESTION_NOT_FOUND', ErrorCode.VIDEO_ATTENDANCE_QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.applyQuestion(row, dto, classId)
    return this.questionRepository.save(row)
  }

  async deleteQuestion(classId: number, id: number) {
    const row = await this.questionRepository.findOne({ where: { id, class_id: classId } })
    if (!row) throwAppException('VIDEO_ATTENDANCE_QUESTION_NOT_FOUND', ErrorCode.VIDEO_ATTENDANCE_QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.questionRepository.remove(row)
  }

  private async applyQuestion(row: VideoAttendanceQuestion, dto: UpdateVideoAttendanceQuestionDto, classId: number) {
    if (dto.lesson_id !== undefined) {
      if (dto.lesson_id !== null) {
        const lesson = await this.lessonRepository.findOne({ where: { id: dto.lesson_id }, relations: ['class'] })
        if (!lesson || lesson.class?.id !== classId) {
          throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
      }
      row.lesson_id = dto.lesson_id
    }
    if (dto.question !== undefined) row.question = dto.question.trim()
    if (dto.type !== undefined) row.type = dto.type
    if (dto.options !== undefined) row.options = dto.options.map(o => o.trim())
    if (dto.correct_option !== undefined) row.correct_option = dto.correct_option
    if (dto.accepted_answers !== undefined) row.accepted_answers = dto.accepted_answers.map(a => a.trim()).filter(Boolean)
    if (dto.is_active !== undefined) row.is_active = dto.is_active

    if (!row.question) {
      throwAppException('VIDEO_ATTENDANCE_QUESTION_INVALID', ErrorCode.VIDEO_ATTENDANCE_QUESTION_INVALID, HttpStatus.BAD_REQUEST)
    }
    if (row.type === QuestionType.CHOICE) {
      const options = row.options ?? []
      const valid =
        options.length >= 2 &&
        options.every(o => o.length > 0) &&
        Number.isInteger(row.correct_option) &&
        row.correct_option >= 0 &&
        row.correct_option < options.length
      if (!valid) throwAppException('VIDEO_ATTENDANCE_QUESTION_INVALID', ErrorCode.VIDEO_ATTENDANCE_QUESTION_INVALID, HttpStatus.BAD_REQUEST)
      row.accepted_answers = null
    } else if (row.type === QuestionType.TEXT) {
      if (!row.accepted_answers || row.accepted_answers.length === 0) {
        throwAppException('VIDEO_ATTENDANCE_QUESTION_INVALID', ErrorCode.VIDEO_ATTENDANCE_QUESTION_INVALID, HttpStatus.BAD_REQUEST)
      }
      row.options = null
      row.correct_option = null
    } else {
      throwAppException('VIDEO_ATTENDANCE_QUESTION_INVALID', ErrorCode.VIDEO_ATTENDANCE_QUESTION_INVALID, HttpStatus.BAD_REQUEST)
    }
  }

  // ------------------------------------------------------------------ học viên

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve()
    const run = prev.catch(() => undefined).then(fn)
    const tail = run.catch(() => undefined)
    this.locks.set(key, tail)
    try {
      return await run
    } finally {
      if (this.locks.get(key) === tail) this.locks.delete(key)
    }
  }

  private async loadStudentContext(lessonId: number, userId: number, requireMembership: boolean): Promise<StudentContext> {
    const student = await this.studentRepository.findOne({ where: { user_id: userId } })
    if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class', 'attendance_rule'] })
    if (!lesson || !lesson.class) throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    const classStudent = await this.classStudentRepository.findOne({ where: { class_id: lesson.class.id, student_id: student.id } })
    if (!classStudent && requireMembership) {
      throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }
    const settings = await this.getSettings(lesson.class.id)
    return { student, lesson, classStudent, settings }
  }

  /**
   * Dòng tiến độ của đúng video đang xem. Dòng cũ (trước khi tách theo video, video_key '')
   * được video đầu tiên mở lại "nhận" để không mất phần đã xem.
   */
  private async findRows(lessonId: number, studentId: number, videoUrl?: string) {
    const rows = await this.progressRepository.find({ where: { lesson_id: lessonId, student_id: studentId }, order: { id: 'ASC' } })
    const key = videoKeyOf(videoUrl)
    let row = rows.find(r => (r.video_key ?? '') === key) ?? null
    if (!row && key) row = rows.find(r => !r.video_key) ?? null
    return { rows, row, key }
  }

  /** Dòng cũ chỉ có watched_seconds → coi như đã xem liền từ đầu (giữ đúng số giây đã ghi nhận). */
  private hydrate(row: LessonVideoProgress) {
    const duration = row.total_duration > 0 ? row.total_duration : undefined
    if (!Array.isArray(row.watched_ranges)) {
      const legacy = Math.max(0, Number(row.watched_seconds) || 0)
      row.watched_ranges = legacy > 0 ? normalizeRanges([[0, legacy]], duration) : []
    } else {
      row.watched_ranges = normalizeRanges(row.watched_ranges, duration)
    }
    row.pending_ranges = normalizeRanges(row.pending_ranges ?? [], duration)
    row.since_check_seconds = Number(row.since_check_seconds) || 0
    row.checks_passed = row.checks_passed ?? 0
    row.checks_failed = row.checks_failed ?? 0
  }

  private pendingNew(row: LessonVideoProgress): Range[] {
    return subtractRanges(row.pending_ranges ?? [], row.watched_ranges ?? [])
  }

  private commitPending(row: LessonVideoProgress) {
    row.watched_ranges = unionRanges(row.watched_ranges ?? [], row.pending_ranges ?? [], row.total_duration)
    row.pending_ranges = []
  }

  private resetCheckCycle(row: LessonVideoProgress, s: VideoAttendanceSettings) {
    row.active_check = null
    row.since_check_seconds = 0
    row.next_check_after_seconds = nextCheckAfterSeconds(s.idle_check_interval_minutes)
  }

  private passCheck(row: LessonVideoProgress, s: VideoAttendanceSettings, now: Date) {
    const credited = rangesLength(this.pendingNew(row))
    const questionId = (row.active_check as ActiveCheck | null)?.question_id ?? null
    this.commitPending(row)
    row.checks_passed += 1
    this.resetCheckCycle(row, s)
    row.last_check_result = { result: 'PASSED', credited_seconds: credited, discarded_seconds: 0, question_id: questionId, at: now.toISOString() }
  }

  private failCheck(row: LessonVideoProgress, s: VideoAttendanceSettings, result: 'WRONG' | 'TIMEOUT', now: Date) {
    const pendingSeconds = rangesLength(this.pendingNew(row))
    const questionId = (row.active_check as ActiveCheck | null)?.question_id ?? null
    let discarded = 0
    if (s.idle_check_discard_on_fail) {
      discarded = pendingSeconds
      row.pending_ranges = []
    } else {
      this.commitPending(row)
    }
    row.checks_failed += 1
    this.resetCheckCycle(row, s)
    row.last_check_result = {
      result,
      credited_seconds: s.idle_check_discard_on_fail ? 0 : pendingSeconds,
      discarded_seconds: discarded,
      question_id: questionId,
      at: now.toISOString(),
    }
  }

  private isCheckExpired(check: ActiveCheck, now: Date): boolean {
    return now.getTime() > Date.parse(check.expires_at) + CHECK_GRACE_SECONDS * 1000
  }

  private async issueCheck(row: LessonVideoProgress, ctx: StudentContext, now: Date) {
    const s = ctx.settings
    let questionId: number | null = null
    if (s.idle_check_mode === IdleCheckMode.QUESTION) {
      let pool = await this.questionRepository.find({
        where: { class_id: ctx.lesson.class.id, lesson_id: ctx.lesson.id, is_active: true },
        select: ['id'],
      })
      if (pool.length === 0) {
        pool = await this.questionRepository.find({
          where: { class_id: ctx.lesson.class.id, lesson_id: IsNull(), is_active: true },
          select: ['id'],
        })
      }
      // Không hỏi lại đúng câu vừa hỏi nếu còn câu khác
      const lastId = row.last_check_result?.question_id
      const candidates = pool.length > 1 ? pool.filter(q => q.id !== lastId) : pool
      if (candidates.length > 0) questionId = candidates[Math.floor(Math.random() * candidates.length)].id
    }
    const check: ActiveCheck = {
      id: randomUUID(),
      question_id: questionId,
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + s.idle_check_timeout_seconds * 1000).toISOString(),
      attempts: 0,
    }
    row.active_check = check
  }

  /** Thông tin bài kiểm tra gửi cho học viên — KHÔNG có đáp án. */
  private async publicCheck(row: LessonVideoProgress, s: VideoAttendanceSettings) {
    const check = row.active_check as ActiveCheck | null
    if (!check) return null
    const question = check.question_id ? await this.questionRepository.findOne({ where: { id: check.question_id } }) : null
    const kind = question ? (question.type === QuestionType.TEXT ? 'TEXT' : 'CHOICE') : 'CONFIRM'
    return {
      id: check.id,
      kind,
      question: question?.question ?? CONFIRM_QUESTION_TEXT,
      options: kind === 'CHOICE' ? (question?.options ?? []) : null,
      issued_at: check.issued_at,
      expires_at: check.expires_at,
      timeout_seconds: s.idle_check_timeout_seconds,
      // Client đếm ngược theo số này, không theo expires_at — đồng hồ máy học viên có thể lệch
      remaining_seconds: Math.max(0, Math.round((Date.parse(check.expires_at) - Date.now()) / 1000)),
      attempts_left: Math.max(0, s.idle_check_max_attempts - (check.attempts ?? 0)),
    }
  }

  private loadQuestionForCheck(check: ActiveCheck) {
    return check.question_id ? this.questionRepository.findOne({ where: { id: check.question_id } }) : Promise.resolve(null)
  }

  async getProgress(lessonId: number, userId: number, videoUrl?: string) {
    const ctx = await this.loadStudentContext(lessonId, userId, false)
    return this.withLock(`${ctx.student.id}:${lessonId}`, async () => {
      const { rows, row } = await this.findRows(lessonId, ctx.student.id, videoUrl)
      rows.forEach(r => this.hydrate(r))
      let checkResult: { result: CheckResult; discarded_seconds: number } | null = null
      // Bài kiểm tra đã quá hạn trong lúc học viên đóng trang → chốt "không trả lời kịp"
      const active = row?.active_check as ActiveCheck | null
      if (row && active && ctx.settings.idle_check_enabled && this.isCheckExpired(active, new Date())) {
        this.failCheck(row, ctx.settings, 'TIMEOUT', new Date())
        this.finalizeRow(row, ctx.settings, new Date())
        await this.progressRepository.save(row)
        checkResult = { result: 'TIMEOUT', discarded_seconds: row.last_check_result?.discarded_seconds ?? 0 }
      }
      const attendance = await this.evaluateAttendance(ctx, rows, false)
      return this.buildResponse(ctx, row, videoUrl, attendance, checkResult)
    })
  }

  async heartbeat(lessonId: number, userId: number, dto: UpdateVideoProgressDto) {
    const ctx = await this.loadStudentContext(lessonId, userId, true)
    return this.withLock(`${ctx.student.id}:${lessonId}`, async () => {
      const s = ctx.settings
      const now = new Date()
      const found = await this.findRows(lessonId, ctx.student.id, dto.video_url)
      const rows = found.rows
      let row = found.row

      const lastBeat = rows.reduce<number | null>((m, r) => {
        const t = r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : null
        return t !== null && (m === null || t > m) ? t : m
      }, null)
      const elapsed = lastBeat === null ? null : (now.getTime() - lastBeat) / 1000

      if (!row) {
        row = this.progressRepository.create({
          lesson_id: lessonId,
          student_id: ctx.student.id,
          video_key: found.key,
          video_url: dto.video_url ?? null,
          last_position: 0,
          watched_seconds: 0,
          total_duration: dto.duration,
          is_completed: false,
          watched_ranges: [],
          pending_ranges: [],
          since_check_seconds: 0,
          next_check_after_seconds: null,
          active_check: null,
          checks_passed: 0,
          checks_failed: 0,
        })
        rows.push(row)
      }
      rows.forEach(r => this.hydrate(r))
      if (found.key && !row.video_key) {
        row.video_key = found.key
        row.video_url = dto.video_url ?? null
      }

      row.total_duration = dto.duration
      row.last_position = Math.min(dto.current_time, dto.duration)
      row.last_heartbeat_at = now

      const raw = dto.ranges !== undefined ? dto.ranges : legacyDeltaToRanges(dto.current_time, dto.watched_delta)
      const credited = creditRanges({
        ranges: raw,
        duration: dto.duration,
        elapsedSeconds: elapsed,
        playbackRate: dto.playback_rate,
        maxPlaybackRate: s.max_playback_rate,
      })

      let checkResult: { result: CheckResult; discarded_seconds: number } | null = null
      const active = row.active_check as ActiveCheck | null
      if (active && (!s.idle_check_enabled || this.isCheckExpired(active, now))) {
        if (!s.idle_check_enabled) {
          row.active_check = null
        } else {
          this.failCheck(row, s, 'TIMEOUT', now)
          checkResult = { result: 'TIMEOUT', discarded_seconds: row.last_check_result?.discarded_seconds ?? 0 }
        }
      }

      if (!s.idle_check_enabled) {
        // Tắt kiểm tra (hoặc vừa bị giảng viên tắt): mọi thứ đang chờ được tính luôn
        row.watched_ranges = unionRanges(unionRanges(row.watched_ranges, row.pending_ranges, dto.duration), credited, dto.duration)
        row.pending_ranges = []
      } else if (!row.active_check && !checkResult) {
        row.pending_ranges = unionRanges(row.pending_ranges, credited, dto.duration)
        row.since_check_seconds += rangesLength(credited)
        if (row.next_check_after_seconds === null || row.next_check_after_seconds === undefined) {
          row.next_check_after_seconds = nextCheckAfterSeconds(s.idle_check_interval_minutes)
        }
        const pendingNew = rangesLength(this.pendingNew(row))
        if (pendingNew > 0) {
          const committed = rangesLength(row.watched_ranges)
          const crossing =
            isVideoComplete(committed + pendingNew, dto.duration, s) && !isVideoComplete(committed, dto.duration, s)
          if (row.since_check_seconds >= row.next_check_after_seconds || crossing || dto.ended) {
            await this.issueCheck(row, ctx, now)
          }
        }
      }
      // Đang chờ trả lời: phần vừa phát KHÔNG được tính (video lẽ ra đang dừng)

      this.finalizeRow(row, s, now)
      await this.progressRepository.save(row)
      const attendance = await this.evaluateAttendance(ctx, rows, true)
      return this.buildResponse(ctx, row, dto.video_url, attendance, checkResult)
    })
  }

  async answerCheck(lessonId: number, userId: number, dto: AnswerVideoCheckDto) {
    const ctx = await this.loadStudentContext(lessonId, userId, true)
    return this.withLock(`${ctx.student.id}:${lessonId}`, async () => {
      const s = ctx.settings
      const now = new Date()
      const { rows, row } = await this.findRows(lessonId, ctx.student.id, dto.video_url)
      rows.forEach(r => this.hydrate(r))
      const active = row?.active_check as ActiveCheck | null
      if (!row || !active || active.id !== dto.check_id) {
        const attendance = await this.evaluateAttendance(ctx, rows, false)
        return this.buildResponse(ctx, row, dto.video_url, attendance, { result: 'STALE', discarded_seconds: 0 })
      }

      let result: CheckResult
      if (!s.idle_check_enabled) {
        this.commitPending(row)
        this.resetCheckCycle(row, s)
        result = 'PASSED'
      } else if (this.isCheckExpired(active, now)) {
        this.failCheck(row, s, 'TIMEOUT', now)
        result = 'TIMEOUT'
      } else {
        const question = await this.loadQuestionForCheck(active)
        const correct = isAnswerCorrect(
          question
            ? {
                type: question.type as QuestionType,
                options: question.options,
                correct_option: question.correct_option,
                accepted_answers: question.accepted_answers,
              }
            : null,
          dto.answer,
        )
        if (correct) {
          this.passCheck(row, s, now)
          result = 'PASSED'
        } else {
          const attempts = (active.attempts ?? 0) + 1
          if (attempts >= s.idle_check_max_attempts) {
            this.failCheck(row, s, 'WRONG', now)
            result = 'WRONG'
          } else {
            row.active_check = { ...active, attempts }
            result = 'WRONG_RETRY'
          }
        }
      }

      this.finalizeRow(row, s, now)
      await this.progressRepository.save(row)
      const attendance = await this.evaluateAttendance(ctx, rows, true)
      const discarded = result === 'WRONG' || result === 'TIMEOUT' ? (row.last_check_result?.discarded_seconds ?? 0) : 0
      return this.buildResponse(ctx, row, dto.video_url, attendance, { result, discarded_seconds: discarded })
    })
  }

  private finalizeRow(row: LessonVideoProgress, s: VideoAttendanceSettings, now: Date) {
    row.watched_seconds = rangesLength(row.watched_ranges ?? [])
    if (!row.is_completed && isVideoComplete(row.watched_seconds, row.total_duration, s)) {
      row.is_completed = true
      row.completed_at = now
    }
  }

  private blockReason(ctx: StudentContext): BlockReason | null {
    const s = ctx.settings
    if (!s.enabled) return 'DISABLED'
    if (!ctx.classStudent || !s.eligible_learn_types.includes(ctx.classStudent.learn_type)) return 'NOT_ELIGIBLE_LEARN_TYPE'
    if (!ctx.lesson.attendance_rule_id || !ctx.lesson.attendance_rule) return 'NO_ATTENDANCE_RULE'
    return null
  }

  /**
   * Đánh giá điểm danh của buổi (gộp mọi video của buổi). `write` = được phép ghi bảng
   * attendance; chỉ NÂNG trạng thái, không bao giờ hạ cái giảng viên/máy quét đã ghi.
   */
  private async evaluateAttendance(ctx: StudentContext, rows: LessonVideoProgress[], write: boolean) {
    const s = ctx.settings
    const trackableKeys = [...new Set((ctx.lesson.video_url ?? []).filter(isTrackableVideoUrl).map(videoKeyOf))]
    const completeKeys = new Set(
      rows.filter(r => isVideoComplete(rangesLength(r.watched_ranges ?? []), r.total_duration, s)).map(r => r.video_key ?? ''),
    )
    const lessonCompleted = isLessonComplete(trackableKeys, completeKeys, s.multi_video_rule)

    let blockReason = this.blockReason(ctx)
    let existing: Attendance | null = null
    if (ctx.classStudent && ctx.lesson.attendance_rule) {
      existing = await this.attendanceRepository.findOne({
        where: { class_student_id: ctx.classStudent.id, attendance_date: ctx.lesson.attendance_rule.lesson_date },
      })
    }

    if (!blockReason) {
      const target = resolveAttendanceTarget(ctx.lesson.attendance_rule.lesson_date, todayInVietnam(), s)
      if ('blocked' in target) {
        blockReason = target.blocked
      } else if (lessonCompleted && write) {
        const next = upgradeAttendanceStatus(existing?.status ?? null, target.status)
        if (next !== null) {
          const ruleText =
            s.mode === VideoAttendanceMode.ANY_VIEW ? `xem tối thiểu ${s.min_view_seconds} giây` : `hoàn thành >= ${s.required_percent}%`
          const note = `${AUTO_NOTE} (${ruleText})`
          if (existing) {
            existing.status = next
            existing.note = note
            existing = await this.attendanceRepository.save(existing)
          } else {
            existing = await this.attendanceRepository.save(
              this.attendanceRepository.create({
                class_student_id: ctx.classStudent.id,
                attendance_date: ctx.lesson.attendance_rule.lesson_date,
                status: next,
                note,
              }),
            )
          }
        }
      }
    }

    const status = existing?.status ?? null
    return {
      lesson_completed: lessonCompleted,
      attendance_status: status,
      attendance_marked: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE,
      block_reason: blockReason,
      trackable_video_count: trackableKeys.length,
    }
  }

  private publicRules(s: VideoAttendanceSettings) {
    return {
      enabled: s.enabled,
      mode: s.mode,
      required_percent: s.required_percent,
      min_view_seconds: s.min_view_seconds,
      multi_video_rule: s.multi_video_rule,
      block_seek_forward: s.block_seek_forward,
      max_playback_rate: s.max_playback_rate,
      pause_when_hidden: s.pause_when_hidden,
      late_after_days: s.late_after_days,
      deadline_days: s.deadline_days,
      idle_check_enabled: s.idle_check_enabled,
      idle_check_timeout_seconds: s.idle_check_timeout_seconds,
    }
  }

  private async buildResponse(
    ctx: StudentContext,
    row: LessonVideoProgress | null,
    videoUrl: string | undefined,
    attendance: Awaited<ReturnType<VideoAttendanceService['evaluateAttendance']>>,
    checkResult: { result: CheckResult; discarded_seconds: number } | null,
  ) {
    const s = ctx.settings
    const watched = row?.watched_ranges ?? []
    const pending = row ? this.pendingNew(row) : []
    const duration = row?.total_duration ?? 0
    const watchedSeconds = rangesLength(watched)
    const pendingSeconds = rangesLength(pending)
    return {
      lesson_id: ctx.lesson.id,
      video_key: row?.video_key || videoKeyOf(videoUrl),
      last_position: row?.last_position ?? 0,
      watched_seconds: watchedSeconds,
      pending_seconds: pendingSeconds,
      total_duration: duration,
      progress_percentage: percentOf(watchedSeconds, duration),
      pending_percentage: percentOf(pendingSeconds, duration),
      watched_ranges: watched,
      pending_ranges: pending,
      max_watched_position: Math.max(maxEnd(watched), maxEnd(row?.pending_ranges ?? [])),
      // Giữ tên cũ cho client cũ
      attendance_percent: s.required_percent,
      is_completed: row ? isVideoComplete(watchedSeconds, duration, s) : false,
      lesson_completed: attendance.lesson_completed,
      attendance_marked: attendance.attendance_marked,
      attendance_status: attendance.attendance_status,
      block_reason: attendance.block_reason,
      learn_type: ctx.classStudent?.learn_type ?? null,
      checks_passed: row?.checks_passed ?? 0,
      checks_failed: row?.checks_failed ?? 0,
      rules: this.publicRules(s),
      check: row && s.idle_check_enabled ? await this.publicCheck(row, s) : null,
      check_result: checkResult,
      // Kết quả kiểm tra gần nhất — để học viên mở lại vẫn biết lần trước trượt / không kịp
      last_check_result: row?.last_check_result ?? null,
    }
  }

  // ------------------------------------------------------------------ báo cáo

  async report(classId: number, lessonId: number) {
    await this.findClassOrThrow(classId)
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class', 'attendance_rule'] })
    if (!lesson || lesson.class?.id !== classId) throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    const s = await this.getSettings(classId)

    const classStudents = await this.classStudentRepository.find({
      where: { class_id: classId },
      relations: ['student', 'student.user'],
      order: { id: 'ASC' },
    })
    const studentIds = classStudents.map(cs => cs.student_id)
    const progresses = studentIds.length
      ? await this.progressRepository.find({ where: { lesson_id: lessonId, student_id: In(studentIds) } })
      : []
    const attendances =
      lesson.attendance_rule && classStudents.length
        ? await this.attendanceRepository.find({
            where: { class_student_id: In(classStudents.map(cs => cs.id)), attendance_date: lesson.attendance_rule.lesson_date },
          })
        : []

    const videos = (lesson.video_url ?? []).map(url => ({ url, video_key: videoKeyOf(url), trackable: isTrackableVideoUrl(url) }))
    const trackableKeys = [...new Set(videos.filter(v => v.trackable).map(v => v.video_key))]

    const students = classStudents.map(cs => {
      const rows = progresses.filter(p => p.student_id === cs.student_id)
      rows.forEach(r => this.hydrate(r))
      const completeKeys = new Set(
        rows.filter(r => isVideoComplete(rangesLength(r.watched_ranges), r.total_duration, s)).map(r => r.video_key ?? ''),
      )
      const attendance = attendances.find(a => a.class_student_id === cs.id)
      const user = cs.student?.user
      return {
        class_student_id: cs.id,
        student_id: cs.student_id,
        code: user?.code ?? null,
        saint_name: user?.saint_name ?? null,
        full_name: user?.full_name ?? null,
        learn_type: cs.learn_type,
        eligible: s.eligible_learn_types.includes(cs.learn_type),
        lesson_completed: rows.length > 0 && isLessonComplete(trackableKeys, completeKeys, s.multi_video_rule),
        attendance_status: attendance?.status ?? null,
        attendance_note: attendance?.note ?? null,
        videos: rows.map(r => {
          const watched = rangesLength(r.watched_ranges)
          return {
            video_key: r.video_key ?? '',
            video_url: r.video_url ?? null,
            watched_seconds: watched,
            pending_seconds: rangesLength(this.pendingNew(r)),
            total_duration: r.total_duration,
            progress_percentage: percentOf(watched, r.total_duration),
            completed: isVideoComplete(watched, r.total_duration, s),
            checks_passed: r.checks_passed ?? 0,
            checks_failed: r.checks_failed ?? 0,
            last_check_result: r.last_check_result ?? null,
            last_watched_at: r.last_heartbeat_at ?? r.updated_at ?? null,
          }
        }),
      }
    })

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        lesson_date: lesson.attendance_rule?.lesson_date ?? null,
        has_attendance_rule: !!lesson.attendance_rule,
        videos,
      },
      settings: s,
      students,
    }
  }
}
