import { LearnType } from '@enums/class.enum'
import { HvmMeetRole, MeetingProvider } from '@enums/meeting.enum'
import { Role } from '@enums/role.enum'
import { HvmMeetApiError, HvmMeetClientService } from '../services/hvm-meet-client.service'
import { LessonMeetSessionService } from '../services/lesson-meet-session.service'
import { decideMeetingRole, decideReplayAccess, LessonMeetingService } from '../services/lesson-meeting.service'

describe('decideMeetingRole', () => {
  it.each([
    ['giảng viên của lớp', Role.TEACHER, true, null, HvmMeetRole.HOST],
    ['giảng viên lớp khác', Role.TEACHER, false, null, null],
    ['super admin', Role.SUPER_ADMIN, false, null, HvmMeetRole.COHOST],
    ['admin', Role.ADMIN, false, null, HvmMeetRole.COHOST],
    ['giáo vụ', Role.STAFF, false, null, HvmMeetRole.COHOST],
    ['tài chính', Role.FINANCE, false, null, null],
    ['học viên học trực tuyến', Role.STUDENT, false, LearnType.MEETING, HvmMeetRole.PARTICIPANT],
    ['học viên học qua video', Role.STUDENT, false, LearnType.VIDEO, null],
    ['học viên học tại lớp', Role.STUDENT, false, LearnType.OFFLINE, null],
    ['học viên không thuộc lớp', Role.STUDENT, false, null, null],
  ])('%s → %s', (_label, role, isClassTeacher, learnType, expected) => {
    expect(decideMeetingRole({ role, isClassTeacher, learnType })).toBe(expected)
  })
})

describe('decideReplayAccess', () => {
  it.each([
    ['giảng viên của lớp', Role.TEACHER, true, null, true],
    ['giảng viên lớp khác', Role.TEACHER, false, null, false],
    ['admin', Role.ADMIN, false, null, true],
    ['giáo vụ', Role.STAFF, false, null, true],
    ['tài chính', Role.FINANCE, false, null, false],
    ['học viên học trực tuyến', Role.STUDENT, false, LearnType.MEETING, true],
    // khác với vào phòng: học viên học qua video / tại lớp vẫn được xem lại
    ['học viên học qua video', Role.STUDENT, false, LearnType.VIDEO, true],
    ['học viên học tại lớp', Role.STUDENT, false, LearnType.OFFLINE, true],
    ['học viên không thuộc lớp', Role.STUDENT, false, null, false],
  ])('%s → %s', (_label, role, isClassTeacher, learnType, expected) => {
    expect(decideReplayAccess({ role, isClassTeacher, learnType })).toBe(expected)
  })
})

describe('LessonMeetingService.joinLesson', () => {
  let service: LessonMeetingService
  let client: HvmMeetClientService
  let lesson: any
  let lessonRepository: any
  let userRepository: any
  let studentRepository: any
  let teacherRepository: any
  let classStudentRepository: any
  let settingService: any
  let upsertRoom: jest.Mock
  let createTicket: jest.Mock
  let sessions: any[]
  let sessionService: LessonMeetSessionService

  const config = { base_url: 'https://meet.test', api_key: 'hvmm_academy_x', webhook_secret: 's', default_template_key: 'class' }
  const ticket = { ticket: 't1', joinUrl: 'https://meet.test/join/t1', expiresAt: '2026-10-26T11:32:00Z' }

  beforeEach(() => {
    lesson = {
      id: 12,
      title: 'Bài 1: Kinh Thánh',
      start_date: '2026-10-26',
      start_time: '18:30',
      end_time: '20:00',
      meeting_provider: MeetingProvider.HVM_MEET,
      class: { id: 3, name: 'Thánh Kinh K12', teacher_id: 7 },
    }
    lessonRepository = { findOne: jest.fn(async ({ where }) => (where.id === lesson.id ? lesson : null)) }
    userRepository = {
      findOne: jest.fn(async ({ where }) => ({ id: where.id, full_name: `Người ${where.id}`, saint_name: 'Giuse', avatar: null })),
    }
    // user 50 là giảng viên 7 (lớp 3); user 51 là giảng viên 8 (lớp khác)
    teacherRepository = {
      findOne: jest.fn(async ({ where }) => {
        if (where.user_id === 50 || where.id === 7) return { id: 7, user_id: 50, user: { id: 50, full_name: 'Thầy Phêrô', saint_name: null } }
        if (where.user_id === 51) return { id: 8, user_id: 51 }
        return null
      }),
    }
    // user 101 học MEETING, user 102 học VIDEO, user 103 không có trong lớp
    studentRepository = { findOne: jest.fn(async ({ where }) => (where.user_id >= 100 ? { id: where.user_id - 100, user_id: where.user_id } : null)) }
    classStudentRepository = {
      findOne: jest.fn(async ({ where }) => {
        if (where.student_id === 1) return { id: 11, class_id: 3, student_id: 1, learn_type: LearnType.MEETING }
        if (where.student_id === 2) return { id: 12, class_id: 3, student_id: 2, learn_type: LearnType.VIDEO }
        return null
      }),
      find: jest.fn(async () => [{ id: 11, student: { user: { id: 101, full_name: 'Nguyễn Văn A', saint_name: 'Maria' } } }]),
    }
    settingService = { getActiveConfig: jest.fn(async () => config) }

    client = new HvmMeetClientService()
    jest.spyOn(client['logger'], 'error').mockImplementation(() => undefined)
    upsertRoom = jest.fn(async () => ({ id: 'room-1' }))
    createTicket = jest.fn(async () => ticket)
    client.upsertRoom = upsertRoom
    client.createTicket = createTicket

    // sổ session: buổi sess-12a thuộc buổi học 12, sess-99 thuộc buổi học 99
    sessions = [
      { id: 1, lesson_id: 12, session_id: 'sess-12a', started_at: new Date('2026-10-26T11:30:00Z'), ended_at: new Date('2026-10-26T13:00:00Z') },
      { id: 2, lesson_id: 99, session_id: 'sess-99', started_at: new Date('2026-10-20T11:30:00Z'), ended_at: null },
    ]
    const sessionRepository = {
      findOne: jest.fn(async ({ where }) => sessions.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null),
      find: jest.fn(async ({ where }) => sessions.filter(row => row.lesson_id === where.lesson_id)),
      create: jest.fn(data => ({ ...data })),
      save: jest.fn(async row => {
        if (!row.id) {
          row.id = sessions.length + 1
          sessions.push(row)
        }
        return row
      }),
    }
    client.listSessions = jest.fn(async () => [])
    sessionService = new LessonMeetSessionService(sessionRepository as any, client)

    service = new LessonMeetingService(
      lessonRepository,
      userRepository,
      studentRepository,
      teacherRepository,
      classStudentRepository,
      settingService,
      client,
      sessionService,
    )
  })

  it('giảng viên của lớp vào với vai trò host; phòng có lịch giờ VN, tiêu đề, roster, metadata', async () => {
    const result = await service.joinLesson(12, { userId: 50, role: Role.TEACHER })

    expect(result).toEqual({
      joinUrl: ticket.joinUrl,
      expiresAt: ticket.expiresAt,
      role: HvmMeetRole.HOST,
      externalId: 'lesson-12',
      lesson: { id: 12, title: 'Bài 1: Kinh Thánh', class_id: 3, class_name: 'Thánh Kinh K12' },
    })
    expect(upsertRoom).toHaveBeenCalledWith({ baseUrl: 'https://meet.test', apiKey: 'hvmm_academy_x' }, 'lesson-12', {
      title: 'Thánh Kinh K12 — Bài 1: Kinh Thánh',
      templateKey: 'class',
      scheduledStart: '2026-10-26T11:30:00.000Z',
      scheduledEnd: '2026-10-26T13:00:00.000Z',
      metadata: { classId: 3, lessonId: 12 },
      roster: [
        { identity: 'academy:user:50', name: 'Thầy Phêrô', roleKey: 'host', externalUserId: '50' },
        { identity: 'academy:user:101', name: 'Maria Nguyễn Văn A', roleKey: 'participant', externalUserId: '101' },
      ],
    })
    expect(classStudentRepository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { class_id: 3, learn_type: LearnType.MEETING } }))
    expect(createTicket).toHaveBeenCalledWith(expect.anything(), 'lesson-12', {
      identity: 'academy:user:50',
      name: 'Giuse Người 50',
      roleKey: 'host',
      externalUserId: '50',
      avatarUrl: undefined,
      metadata: { classId: 3, lessonId: 12 },
    })
  })

  it('học viên học trực tuyến (MEETING) vào với vai trò participant', async () => {
    await expect(service.joinLesson(12, { userId: 101, role: Role.STUDENT })).resolves.toMatchObject({ role: HvmMeetRole.PARTICIPANT })
  })

  it('admin / giáo vụ vào với vai trò cohost', async () => {
    await expect(service.joinLesson(12, { userId: 1, role: Role.ADMIN })).resolves.toMatchObject({ role: HvmMeetRole.COHOST })
    await expect(service.joinLesson(12, { userId: 2, role: Role.STAFF })).resolves.toMatchObject({ role: HvmMeetRole.COHOST })
  })

  it.each([
    ['học viên học qua video', 102, Role.STUDENT],
    ['học viên không thuộc lớp', 103, Role.STUDENT],
    ['giảng viên lớp khác', 51, Role.TEACHER],
  ])('%s bị chặn (403, reason NOT_ALLOWED) và không xin vé', async (_label, userId, role) => {
    const error = await service.joinLesson(12, { userId, role }).catch(err => err)
    expect(error.getStatus()).toBe(403)
    expect(error.response.data).toEqual({ reason: 'NOT_ALLOWED' })
    expect(createTicket).not.toHaveBeenCalled()
  })

  it('buổi học dùng link ngoài thì không cấp vé', async () => {
    lesson.meeting_provider = MeetingProvider.EXTERNAL
    const error = await service.joinLesson(12, { userId: 101, role: Role.STUDENT }).catch(err => err)
    expect(error.response.data).toEqual({ reason: 'NOT_HVM_MEET' })
  })

  it('tích hợp đang tắt / thiếu cấu hình → 503 NOT_CONFIGURED', async () => {
    settingService.getActiveConfig.mockResolvedValue(null)
    const error = await service.joinLesson(12, { userId: 101, role: Role.STUDENT }).catch(err => err)
    expect(error.getStatus()).toBe(503)
    expect(error.response.data).toEqual({ reason: 'NOT_CONFIGURED' })
  })

  it('buổi học không tồn tại → 404', async () => {
    const error = await service.joinLesson(999, { userId: 101, role: Role.STUDENT }).catch(err => err)
    expect(error.getStatus()).toBe(404)
  })

  it('chưa tới giờ: trả 403 ROOM_NOT_OPEN_YET kèm giờ mở phòng', async () => {
    createTicket.mockRejectedValue(new HvmMeetApiError('Chưa tới giờ vào phòng', 403, 'ROOM_NOT_OPEN_YET', { opensAt: '2026-10-26T11:15:00Z' }))
    const error = await service.joinLesson(12, { userId: 101, role: Role.STUDENT }).catch(err => err)
    expect(error.getStatus()).toBe(403)
    expect(error.response.data).toEqual({ reason: 'ROOM_NOT_OPEN_YET', opens_at: '2026-10-26T11:15:00Z' })
  })

  it('HVM Meet không phản hồi → 503 UNAVAILABLE', async () => {
    upsertRoom.mockRejectedValue(new HvmMeetApiError('timeout', null, 'TIMEOUT'))
    const error = await service.joinLesson(12, { userId: 101, role: Role.STUDENT }).catch(err => err)
    expect(error.getStatus()).toBe(503)
    expect(error.response.data).toMatchObject({ reason: 'UNAVAILABLE' })
  })

  it('không PUT lại phòng khi nội dung không đổi, nhưng mỗi lần vào đều xin vé mới', async () => {
    await service.joinLesson(12, { userId: 101, role: Role.STUDENT })
    await service.joinLesson(12, { userId: 50, role: Role.TEACHER })
    expect(upsertRoom).toHaveBeenCalledTimes(1)
    expect(createTicket).toHaveBeenCalledTimes(2)

    lesson.start_time = '19:00'
    await service.joinLesson(12, { userId: 101, role: Role.STUDENT })
    expect(upsertRoom).toHaveBeenCalledTimes(2)
  })

  it('phòng mất bên HVM Meet (ROOM_NOT_FOUND) thì tạo lại rồi xin vé lần nữa', async () => {
    await service.joinLesson(12, { userId: 101, role: Role.STUDENT })
    createTicket.mockRejectedValueOnce(new HvmMeetApiError('Không tìm thấy phòng', 404, 'ROOM_NOT_FOUND'))

    await expect(service.joinLesson(12, { userId: 101, role: Role.STUDENT })).resolves.toMatchObject({ joinUrl: ticket.joinUrl })
    expect(upsertRoom).toHaveBeenCalledTimes(2)
  })

  describe('xem lại buổi học', () => {
    const replayTicket = { ticket: 'r1', joinUrl: 'https://meet.test/replay/r1', expiresAt: '2026-10-27T01:02:00Z' }

    beforeEach(() => {
      client.createReplayTicket = jest.fn(async () => replayTicket)
      client.getArchive = jest.fn(async () => ({ session: { id: 'sess-12a' }, chat: [], events: [] }) as any)
    })

    it('học viên học qua video được xem danh sách buổi (có thời lượng), kèm đồng bộ bù từ HVM Meet', async () => {
      ;(client.listSessions as jest.Mock).mockResolvedValue([
        { id: 'sess-12b', roomId: 'room-1', startedAt: '2026-10-27T11:30:00Z', endedAt: null, peakParticipants: 3, participantCount: 3 },
      ])

      const result = await service.listSessions(12, { userId: 102, role: Role.STUDENT })

      expect(client.listSessions).toHaveBeenCalledWith({ baseUrl: 'https://meet.test', apiKey: 'hvmm_academy_x' }, 'lesson-12')
      expect(result.map(item => item.session_id)).toEqual(['sess-12a', 'sess-12b'])
      expect(result[0]).toMatchObject({ duration_seconds: 5400, is_live: false })
      expect(result[1]).toMatchObject({ is_live: true, duration_seconds: null })
    })

    it('tích hợp đang tắt vẫn liệt kê được từ sổ trong DB', async () => {
      settingService.getActiveConfig.mockResolvedValue(null)
      await expect(service.listSessions(12, { userId: 50, role: Role.TEACHER })).resolves.toHaveLength(1)
      expect(client.listSessions).not.toHaveBeenCalled()
    })

    it.each([
      ['học viên không thuộc lớp', 103, Role.STUDENT],
      ['giảng viên lớp khác', 51, Role.TEACHER],
      ['tài chính', 5, Role.FINANCE],
    ])('%s không được xem lại (403)', async (_label, userId, role) => {
      const error = await service.listSessions(12, { userId, role }).catch(err => err)
      expect(error.getStatus()).toBe(403)
      expect(error.response.data).toEqual({ reason: 'NOT_ALLOWED' })
    })

    it('cấp vé xem lại với identity của người xem, trả url để nhúng', async () => {
      await expect(service.createReplay(12, 'sess-12a', { userId: 102, role: Role.STUDENT })).resolves.toEqual({
        url: replayTicket.joinUrl,
        expiresAt: replayTicket.expiresAt,
      })
      expect(client.createReplayTicket).toHaveBeenCalledWith(expect.anything(), 'sess-12a', {
        identity: 'academy:user:102',
        name: 'Giuse Người 102',
      })
    })

    it('session của buổi học khác (đổi sessionId trên URL) → 404, không cấp vé', async () => {
      const error = await service.createReplay(12, 'sess-99', { userId: 101, role: Role.STUDENT }).catch(err => err)
      expect(error.getStatus()).toBe(404)
      expect(error.response.data).toEqual({ reason: 'SESSION_NOT_FOUND' })
      // đã thử đồng bộ bù trước khi kết luận
      expect(client.listSessions).toHaveBeenCalled()
      expect(client.createReplayTicket).not.toHaveBeenCalled()
    })

    it('session chưa có trong sổ (lỡ webhook) nhưng HVM Meet có → đồng bộ bù rồi cấp vé', async () => {
      ;(client.listSessions as jest.Mock).mockResolvedValue([
        {
          id: 'sess-12c',
          roomId: 'room-1',
          startedAt: '2026-10-28T11:30:00Z',
          endedAt: '2026-10-28T13:00:00Z',
          peakParticipants: 9,
          participantCount: 9,
        },
      ])
      await expect(service.createReplay(12, 'sess-12c', { userId: 50, role: Role.TEACHER })).resolves.toMatchObject({ url: replayTicket.joinUrl })
    })

    it('học viên không xem được biên bản thô; admin thì được', async () => {
      const error = await service.getArchive(12, 'sess-12a', { userId: 101, role: Role.STUDENT }).catch(err => err)
      expect(error.getStatus()).toBe(403)

      await expect(service.getArchive(12, 'sess-12a', { userId: 1, role: Role.ADMIN })).resolves.toMatchObject({ session: { id: 'sess-12a' } })
    })

    it('HVM Meet báo SESSION_NOT_FOUND khi cấp vé → 404', async () => {
      ;(client.createReplayTicket as jest.Mock).mockRejectedValue(new HvmMeetApiError('Không tìm thấy buổi', 404, 'SESSION_NOT_FOUND'))
      const error = await service.createReplay(12, 'sess-12a', { userId: 1, role: Role.ADMIN }).catch(err => err)
      expect(error.getStatus()).toBe(404)
    })
  })
})
