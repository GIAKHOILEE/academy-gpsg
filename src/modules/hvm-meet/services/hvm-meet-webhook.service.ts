import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Student } from '@modules/students/students.entity'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { HvmMeetRole } from '@enums/meeting.enum'
import { parseLessonExternalId } from '../hvm-meet.constants'
import {
  appendVideoUrl,
  buildHvmMeetAttendanceNote,
  isHvmMeetAttendanceNote,
  mapHvmMeetAttendanceStatus,
  normalizeLessonDate,
  pickRecordingPlaybackUrl,
} from '../hvm-meet.mapping'
import { HvmMeetAttendanceFinalizedData, HvmMeetRecordingReadyData, HvmMeetWebhookEnvelope } from '../hvm-meet.types'

export interface HvmMeetWebhookResult {
  event: string
  handled: boolean
  /** Lý do bỏ qua (sự kiện không cần xử lý, phòng không phải của buổi học...) */
  skipped?: string
  [key: string]: any
}

/**
 * Xử lý sự kiện HVM Meet gửi về (đã qua kiểm chữ ký ở controller).
 *
 * HVM Meet thử lại khi nhận mã khác 2xx, nên mọi xử lý đều idempotent: gửi lại cùng sự kiện
 * cho ra cùng kết quả (upsert điểm danh, link bản ghi chỉ thêm khi chưa có). Lỗi DB thì ném ra
 * để trả 5xx và được gửi lại; dữ liệu không khớp (phòng lạ, buổi học đã xoá) thì trả 2xx và bỏ qua.
 */
@Injectable()
export class HvmMeetWebhookService {
  private readonly logger = new Logger(HvmMeetWebhookService.name)

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async handle(envelope: HvmMeetWebhookEnvelope): Promise<HvmMeetWebhookResult> {
    const event = String(envelope?.event || '')

    switch (event) {
      case 'attendance.finalized':
        return this.handleAttendanceFinalized(envelope.data)
      case 'recording.ready':
        return this.handleRecordingReady(envelope.data)
      default:
        // room.started, room.ended, participant.*, attendance.check.closed, recording.started/failed, poll.closed, ping...
        this.logger.log(`Nhận sự kiện HVM Meet "${event}" (${envelope?.id}), không cần xử lý`)
        return { event, handled: false, skipped: 'event_ignored' }
    }
  }

  /**
   * Ghi điểm danh của học viên theo báo cáo HVM Meet. Không ghi đè bản ghi giáo vụ đã điểm danh tay
   * (ghi chú không bắt đầu bằng "HVM Meet:").
   */
  async handleAttendanceFinalized(data: HvmMeetAttendanceFinalizedData): Promise<HvmMeetWebhookResult> {
    const event = 'attendance.finalized'
    const lesson = await this.findLesson(data?.externalId)
    if (!lesson) return { event, handled: false, skipped: 'lesson_not_found' }

    const attendanceDate = this.resolveAttendanceDate(lesson)
    if (!attendanceDate) {
      this.logger.warn(`Buổi học ${lesson.id} chưa có ngày học, bỏ qua điểm danh HVM Meet phiên ${data?.sessionId}`)
      return { event, handled: false, skipped: 'lesson_has_no_date' }
    }

    // Chỉ học viên mới được ghi điểm danh; giảng viên / cán bộ có báo cáo nhưng không thuộc bảng điểm danh lớp
    const reports = (Array.isArray(data?.reports) ? data.reports : []).filter(
      report => report?.roleKey === HvmMeetRole.PARTICIPANT && mapHvmMeetAttendanceStatus(report.status) !== null,
    )
    const userIds = [...new Set(reports.map(report => Number(report.externalUserId)).filter(id => Number.isSafeInteger(id) && id > 0))]
    if (!userIds.length)
      return { event, handled: true, lesson_id: lesson.id, attendance_date: attendanceDate, created: 0, updated: 0, skipped_manual: 0 }

    const students = await this.studentRepository.find({ where: { user_id: In(userIds) } })
    const studentIdByUserId = new Map(students.map(student => [Number(student.user_id), student.id]))
    const classStudents = students.length
      ? await this.classStudentRepository.find({ where: { class_id: lesson.class.id, student_id: In(students.map(student => student.id)) } })
      : []
    const classStudentByStudentId = new Map(classStudents.map(classStudent => [classStudent.student_id, classStudent]))

    const existing = classStudents.length
      ? await this.attendanceRepository.find({
          where: { class_student_id: In(classStudents.map(classStudent => classStudent.id)), attendance_date: attendanceDate },
        })
      : []
    const existingByClassStudentId = new Map(existing.map(attendance => [attendance.class_student_id, attendance]))

    const toSave: Attendance[] = []
    let created = 0
    let updated = 0
    let skippedManual = 0
    let notInClass = 0

    for (const report of reports) {
      const studentId = studentIdByUserId.get(Number(report.externalUserId))
      const classStudent = studentId ? classStudentByStudentId.get(studentId) : null
      if (!classStudent) {
        notInClass++
        continue
      }

      const status = mapHvmMeetAttendanceStatus(report.status)
      const note = buildHvmMeetAttendanceNote(report)
      const current = existingByClassStudentId.get(classStudent.id)

      if (current) {
        if (!isHvmMeetAttendanceNote(current.note)) {
          skippedManual++
          continue
        }
        if (current.status === status && current.note === note) continue
        current.status = status
        current.note = note
        toSave.push(current)
        updated++
        continue
      }

      const attendance = this.attendanceRepository.create({
        class_student_id: classStudent.id,
        attendance_date: attendanceDate,
        status,
        note,
      })
      existingByClassStudentId.set(classStudent.id, attendance)
      toSave.push(attendance)
      created++
    }

    if (toSave.length) await this.attendanceRepository.save(toSave)

    if (notInClass) this.logger.warn(`Điểm danh HVM Meet buổi ${lesson.id}: ${notInClass} người không thuộc lớp ${lesson.class.id}, bỏ qua`)
    return {
      event,
      handled: true,
      lesson_id: lesson.id,
      attendance_date: attendanceDate,
      created,
      updated,
      skipped_manual: skippedManual,
      not_in_class: notInClass,
    }
  }

  /** Gắn link phát lại của bản ghi vào `lesson.video_url` (nếu chưa có). */
  async handleRecordingReady(data: HvmMeetRecordingReadyData): Promise<HvmMeetWebhookResult> {
    const event = 'recording.ready'
    const lesson = await this.findLesson(data?.externalId)
    if (!lesson) return { event, handled: false, skipped: 'lesson_not_found' }

    const url = pickRecordingPlaybackUrl(data?.storage?.urls)
    if (!url) {
      this.logger.warn(`Bản ghi ${data?.recordingId} của buổi ${lesson.id} chưa có link phát lại, bỏ qua`)
      return { event, handled: false, skipped: 'no_playback_url' }
    }

    const videoUrls = appendVideoUrl(lesson.video_url, url)
    if (!videoUrls) return { event, handled: true, lesson_id: lesson.id, added: false }

    await this.lessonRepository.update({ id: lesson.id }, { video_url: videoUrls })
    return { event, handled: true, lesson_id: lesson.id, added: true, url }
  }

  /* ------------------------------ private ------------------------------ */

  private async findLesson(externalId: string): Promise<Lesson | null> {
    const lessonId = parseLessonExternalId(externalId)
    if (!lessonId) {
      this.logger.warn(`Phòng HVM Meet "${externalId}" không phải phòng của buổi học, bỏ qua`)
      return null
    }
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId }, relations: ['class', 'attendance_rule'] })
    if (!lesson || !lesson.class) {
      this.logger.warn(`Không tìm thấy buổi học ${lessonId} cho sự kiện HVM Meet, bỏ qua`)
      return null
    }
    return lesson
  }

  /**
   * Ngày điểm danh: ưu tiên ngày của buổi điểm danh gắn với bài học (giống điểm danh tự động qua video),
   * không có thì lấy ngày học của bài.
   */
  private resolveAttendanceDate(lesson: Lesson): string | null {
    return normalizeLessonDate(lesson.attendance_rule?.lesson_date) || normalizeLessonDate(lesson.start_date)
  }
}
