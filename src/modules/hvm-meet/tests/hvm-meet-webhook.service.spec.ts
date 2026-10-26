import { AttendanceStatus } from '@enums/class.enum'
import { HvmMeetWebhookService } from '../services/hvm-meet-webhook.service'
import { HvmMeetAttendanceReport } from '../hvm-meet.types'

const report = (userId: number, overrides: Partial<HvmMeetAttendanceReport> = {}): HvmMeetAttendanceReport => ({
  identity: `academy:user:${userId}`,
  externalUserId: String(userId),
  name: `Học viên ${userId}`,
  roleKey: 'participant',
  status: 'present',
  computedStatus: 'present',
  attendedSeconds: 3120,
  expectedSeconds: 3600,
  attendancePercent: 86.67,
  lateMinutes: 0,
  checksTotal: 2,
  checksPassed: 2,
  ...overrides,
})

describe('HvmMeetWebhookService', () => {
  let service: HvmMeetWebhookService
  let lessonRepository: any
  let studentRepository: any
  let classStudentRepository: any
  let attendanceRepository: any
  let attendances: any[]
  let lesson: any

  beforeEach(() => {
    lesson = { id: 12, title: 'Bài 1', start_date: '26/10/2026', video_url: ['https://youtu.be/x'], class: { id: 3 }, attendance_rule: null }
    // user 101 → student 1 → class_student 11; user 102 → student 2 → class_student 12; user 103 → student 3 → class_student 13
    attendances = []

    lessonRepository = {
      findOne: jest.fn(async ({ where }) => (where.id === lesson.id ? lesson : null)),
      update: jest.fn(async (_criteria, patch) => Object.assign(lesson, patch)),
    }
    studentRepository = {
      find: jest.fn(async () => [101, 102, 103].map(userId => ({ id: userId - 100, user_id: userId }))),
    }
    classStudentRepository = {
      find: jest.fn(async () => [1, 2, 3].map(studentId => ({ id: 10 + studentId, class_id: 3, student_id: studentId }))),
    }
    attendanceRepository = {
      find: jest.fn(async ({ where }) =>
        attendances.filter(item => item.attendance_date === where.attendance_date && where.class_student_id.value.includes(item.class_student_id)),
      ),
      create: jest.fn(data => ({ ...data })),
      save: jest.fn(async (items: any[]) => {
        for (const item of items) {
          if (!item.id) {
            item.id = attendances.length + 1
            attendances.push(item)
          }
        }
        return items
      }),
    }

    service = new HvmMeetWebhookService(lessonRepository, studentRepository, classStudentRepository, attendanceRepository)
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })

  const finalized = (reports: HvmMeetAttendanceReport[], externalId = 'lesson-12') =>
    service.handle({
      id: 'delivery-1',
      event: 'attendance.finalized',
      createdAt: '2026-10-26T13:05:00Z',
      app: 'academy',
      data: { roomId: 'r1', externalId, sessionId: 's1', reports },
    })

  describe('attendance.finalized', () => {
    it('ghi điểm danh cho học viên theo ngày học, đổi present/late/absent sang PRESENT/LATE/ABSENT', async () => {
      const result = await finalized([
        report(101),
        report(102, { status: 'late', lateMinutes: 10 }),
        report(103, { status: 'absent', attendedSeconds: 0, attendancePercent: 0 }),
      ])

      expect(result).toMatchObject({ handled: true, lesson_id: 12, attendance_date: '2026-10-26', created: 3, updated: 0 })
      expect(attendances.map(item => [item.class_student_id, item.attendance_date, item.status])).toEqual([
        [11, '2026-10-26', AttendanceStatus.PRESENT],
        [12, '2026-10-26', AttendanceStatus.LATE],
        [13, '2026-10-26', AttendanceStatus.ABSENT],
      ])
      expect(attendances[0].note).toBe('HVM Meet: có mặt 52/60 phút (87%), điểm danh giữa buổi 2/2')
    })

    it('ưu tiên ngày của buổi điểm danh gắn với bài học (giống điểm danh qua video)', async () => {
      lesson.attendance_rule = { id: 5, lesson_date: '2026-10-27' }
      await finalized([report(101)])
      expect(attendances[0].attendance_date).toBe('2026-10-27')
    })

    it('KHÔNG ghi đè điểm danh tay của giáo vụ', async () => {
      attendances.push({ id: 1, class_student_id: 11, attendance_date: '2026-10-26', status: AttendanceStatus.ABSENT, note: 'xin phép nghỉ' })
      attendances.push({ id: 2, class_student_id: 12, attendance_date: '2026-10-26', status: AttendanceStatus.PRESENT, note: null })

      const result = await finalized([report(101), report(102, { status: 'absent' })])

      expect(result).toMatchObject({ created: 0, updated: 0, skipped_manual: 2 })
      expect(attendances[0]).toMatchObject({ status: AttendanceStatus.ABSENT, note: 'xin phép nghỉ' })
      expect(attendances[1]).toMatchObject({ status: AttendanceStatus.PRESENT, note: null })
    })

    it('cập nhật bản ghi do chính HVM Meet ghi trước đó (admin HVM Meet sửa tay rồi gửi lại)', async () => {
      attendances.push({
        id: 1,
        class_student_id: 11,
        attendance_date: '2026-10-26',
        status: AttendanceStatus.ABSENT,
        note: 'HVM Meet: vắng, có mặt 5/60 phút (8%)',
      })

      const result = await finalized([report(101)])

      expect(result).toMatchObject({ created: 0, updated: 1 })
      expect(attendances[0]).toMatchObject({ id: 1, status: AttendanceStatus.PRESENT, note: expect.stringMatching(/^HVM Meet: có mặt/) })
    })

    it('idempotent: HVM Meet gửi lại cùng sự kiện không tạo bản ghi trùng', async () => {
      await finalized([report(101), report(102)])
      const second = await finalized([report(101), report(102)])

      expect(attendances).toHaveLength(2)
      expect(second).toMatchObject({ created: 0, updated: 0 })
    })

    it('bỏ qua giảng viên / cán bộ và người không thuộc lớp', async () => {
      classStudentRepository.find.mockResolvedValue([{ id: 11, class_id: 3, student_id: 1 }])

      const result = await finalized([report(101), report(200, { roleKey: 'host' }), report(102)])

      expect(result).toMatchObject({ created: 1, not_in_class: 1 })
      expect(attendances.map(item => item.class_student_id)).toEqual([11])
    })

    it('phòng không phải của buổi học / buổi học đã xoá thì trả 2xx và bỏ qua', async () => {
      await expect(finalized([report(101)], 'meeting-abc')).resolves.toMatchObject({ handled: false, skipped: 'lesson_not_found' })
      await expect(finalized([report(101)], 'lesson-999')).resolves.toMatchObject({ handled: false, skipped: 'lesson_not_found' })
      expect(attendanceRepository.save).not.toHaveBeenCalled()
    })

    it('buổi học chưa có ngày thì không đoán ngày', async () => {
      lesson.start_date = null
      await expect(finalized([report(101)])).resolves.toMatchObject({ handled: false, skipped: 'lesson_has_no_date' })
    })
  })

  describe('recording.ready', () => {
    const ready = (urls: Record<string, string | null>) =>
      service.handle({
        id: 'delivery-2',
        event: 'recording.ready',
        createdAt: '2026-10-26T14:00:00Z',
        app: 'academy',
        data: { recordingId: 'rec1', roomId: 'r1', externalId: 'lesson-12', storage: { assetId: 'a1', urls } },
      })

    it('thêm link embed vào video_url của buổi học', async () => {
      const result = await ready({ embed: 'https://app.test/embed/abc', watch: 'https://app.test/watch/abc' })

      expect(result).toMatchObject({ handled: true, added: true, url: 'https://app.test/embed/abc' })
      expect(lessonRepository.update).toHaveBeenCalledWith({ id: 12 }, { video_url: ['https://youtu.be/x', 'https://app.test/embed/abc'] })
    })

    it('gửi lại lần hai không thêm trùng link', async () => {
      await ready({ embed: 'https://app.test/embed/abc' })
      const second = await ready({ embed: 'https://app.test/embed/abc' })

      expect(second).toMatchObject({ handled: true, added: false })
      expect(lessonRepository.update).toHaveBeenCalledTimes(1)
      expect(lesson.video_url).toEqual(['https://youtu.be/x', 'https://app.test/embed/abc'])
    })

    it('không có embed/watch thì bỏ qua', async () => {
      await expect(ready({ file: 'https://video.test/1.mp4' })).resolves.toMatchObject({ handled: false, skipped: 'no_playback_url' })
      expect(lessonRepository.update).not.toHaveBeenCalled()
    })
  })

  it.each(['room.started', 'room.ended', 'participant.joined', 'attendance.check.closed', 'recording.failed', 'poll.closed', 'ping'])(
    'sự kiện %s chỉ xác nhận, không đụng DB',
    async event => {
      await expect(service.handle({ id: 'x', event, createdAt: '', app: 'academy', data: {} })).resolves.toMatchObject({
        event,
        handled: false,
        skipped: 'event_ignored',
      })
      expect(lessonRepository.findOne).not.toHaveBeenCalled()
    },
  )
})
