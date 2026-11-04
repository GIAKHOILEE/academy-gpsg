import { MeetingProvider } from '@enums/meeting.enum'
import { CreateLessonDto } from '@modules/_online-feature/lesson/dtos/create-lesson.dto'
import { UpdateLessonDto } from '@modules/_online-feature/lesson/dtos/update-lesson.dto'
import { LessonService } from '@modules/_online-feature/lesson/lesson.service'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { HvmMeetSettingController } from '../controllers/hvm-meet-setting.controller'
import { PublicLinkRequestDto, UpdateHvmMeetRoomPolicyDto } from '../dtos/hvm-meet-room-policy.dto'
import { DEFAULT_ROOM_POLICY } from '../hvm-meet.policy'

/** Giống ValidationPipe toàn cục trong main.ts. */
const pipe = new ValidationPipe({ whitelist: true, transform: true })
const validate = (metatype: any, body: any) => pipe.transform(body, { type: 'body', metatype })
const rejects = async (metatype: any, body: any) => {
  const error = await validate(metatype, body).catch(err => err)
  expect(error).toBeInstanceOf(BadRequestException)
  return error
}

const policy = () => JSON.parse(JSON.stringify(DEFAULT_ROOM_POLICY))

describe('DTO chính sách phòng HVM Meet', () => {
  describe('PUT /admin/hvm-meet/room-policy', () => {
    it('mặc định hợp lệ; bỏ trường lạ', async () => {
      const body = policy()
      body.access.hacker = true
      const dto = await validate(UpdateHvmMeetRoomPolicyDto, { policy: body })
      expect(dto.policy.access).not.toHaveProperty('hacker')
    })

    it('policy: null = khôi phục mặc định (hợp lệ)', async () => {
      await expect(validate(UpdateHvmMeetRoomPolicyDto, { policy: null })).resolves.toMatchObject({ policy: null })
    })

    it('thiếu key policy → 400 (body rỗng không được vô tình xoá cấu hình)', async () => {
      await rejects(UpdateHvmMeetRoomPolicyDto, {})
    })

    it('thiếu một phần → 400', async () => {
      await rejects(UpdateHvmMeetRoomPolicyDto, { policy: { access: policy().access } })
    })

    it.each([
      ['access', 'mode', 'open'],
      ['access', 'join_early_minutes', 1441],
      ['access', 'join_early_minutes', -1],
      ['access', 'join_cutoff_minutes', 1441],
      ['access', 'waiting_room', 'yes'],
      ['attendance', 'present_percent', 101],
      ['attendance', 'late_after_minutes', 601],
      ['attendance', 'grace_seconds', 3601],
      ['attendance', 'random_check_count', 21],
      ['attendance', 'check_mode', 'face'],
      ['attendance', 'check_duration_seconds', 9],
      ['attendance', 'check_duration_seconds', 601],
      ['attendance', 'min_checks_percent', 101],
      ['attendance', 'present_percent', 70.5],
    ])('%s.%s = %p → 400', async (section, field, value) => {
      const body = policy()
      body[section][field] = value
      await rejects(UpdateHvmMeetRoomPolicyDto, { policy: body })
    })

    it.each([
      ['access', 'join_early_minutes', 1440],
      ['access', 'join_cutoff_minutes', 0],
      ['attendance', 'random_check_count', 20],
      ['attendance', 'check_duration_seconds', 10],
      ['attendance', 'check_duration_seconds', 600],
      ['attendance', 'present_percent', 0],
    ])('biên %s.%s = %p hợp lệ', async (section, field, value) => {
      const body = policy()
      body[section][field] = value
      await expect(validate(UpdateHvmMeetRoomPolicyDto, { policy: body })).resolves.toBeDefined()
    })

    it.each(['account', 'account_or_code_birthdate', 'account_or_code', 'account_or_guest'])('mode %s hợp lệ', async mode => {
      const body = policy()
      body.access.mode = mode
      await expect(validate(UpdateHvmMeetRoomPolicyDto, { policy: body })).resolves.toBeDefined()
    })
  })

  describe('meet_policy trong DTO buổi học', () => {
    it('không gửi meet_policy → hợp lệ, không có key', async () => {
      const dto = await validate(UpdateLessonDto, { title: 'Bài 2' })
      expect(dto).not.toHaveProperty('meet_policy')
    })

    it('null / từng phần null / một phần → hợp lệ', async () => {
      await expect(validate(UpdateLessonDto, { meet_policy: null })).resolves.toMatchObject({ meet_policy: null })
      await expect(validate(UpdateLessonDto, { meet_policy: { access: null, attendance: null } })).resolves.toBeDefined()
      await expect(validate(CreateLessonDto, { class_id: 1, title: 'x', meet_policy: { access: policy().access } })).resolves.toBeDefined()
    })

    it('giá trị sai trong phần ghi đè → 400', async () => {
      await rejects(UpdateLessonDto, { meet_policy: { access: { ...policy().access, mode: 'open' } } })
      await rejects(CreateLessonDto, { class_id: 1, title: 'x', meet_policy: { attendance: { ...policy().attendance, grace_seconds: 99999 } } })
      await rejects(UpdateLessonDto, { meet_policy: 'account' })
    })
  })

  it('PublicLinkRequestDto: rotate tuỳ chọn, phải là boolean', async () => {
    await expect(validate(PublicLinkRequestDto, {})).resolves.toBeDefined()
    await expect(validate(PublicLinkRequestDto, { rotate: true })).resolves.toMatchObject({ rotate: true })
    await rejects(PublicLinkRequestDto, { rotate: 'yes' })
  })
})

describe('Lưu meet_policy của buổi học + đồng bộ phòng', () => {
  let service: LessonService
  let lesson: any
  let lessonRepository: any
  let setCalls: any[]
  let lessonMeetingService: { syncLessonRoom: jest.Mock }

  beforeEach(() => {
    lesson = { id: 12, meeting_provider: MeetingProvider.HVM_MEET, meet_policy: { access: DEFAULT_ROOM_POLICY.access, attendance: null } }
    setCalls = []
    const qb: any = {
      update: () => qb,
      set: (values: any) => {
        setCalls.push(values)
        return qb
      },
      where: () => qb,
      execute: async () => ({ affected: 1 }),
    }
    lessonRepository = { findOne: jest.fn(async () => lesson), createQueryBuilder: jest.fn(() => qb) }
    lessonMeetingService = { syncLessonRoom: jest.fn(async () => true) }
    const none: any = {}
    service = new LessonService(lessonRepository, none, none, none, none, none, none, none, none, lessonMeetingService as any)
  })

  it('form giảng viên (hvm-home) không gửi meet_policy → cột giữ nguyên, vẫn đồng bộ phòng HVM', async () => {
    const dto = await validate(UpdateLessonDto, { title: 'Bài 2', start_time: '19:00' })
    await service.updateLesson(12, dto)
    expect(setCalls).toEqual([{ title: 'Bài 2', start_time: '19:00' }])
    expect(lessonMeetingService.syncLessonRoom).toHaveBeenCalledWith(12)
  })

  it('meet_policy: null → bỏ ghi đè', async () => {
    await service.updateLesson(12, await validate(UpdateLessonDto, { meet_policy: null }))
    expect(setCalls).toEqual([{ meet_policy: null }])
  })

  it('meet_policy một phần → lưu object thường, phần kia null', async () => {
    const access = { ...DEFAULT_ROOM_POLICY.access, mode: 'account_or_guest' }
    await service.updateLesson(12, await validate(UpdateLessonDto, { meet_policy: { access } }))
    expect(setCalls[0].meet_policy).toEqual({ access, attendance: null })
    expect(setCalls[0].meet_policy.access.constructor).toBe(Object)
  })

  it('buổi link ngoài → không đồng bộ phòng; đổi sang HVM Meet → đồng bộ', async () => {
    lesson.meeting_provider = MeetingProvider.EXTERNAL
    await service.updateLesson(12, await validate(UpdateLessonDto, { title: 'x' }))
    expect(lessonMeetingService.syncLessonRoom).not.toHaveBeenCalled()

    await service.updateLesson(12, await validate(UpdateLessonDto, { meeting_provider: MeetingProvider.HVM_MEET }))
    expect(lessonMeetingService.syncLessonRoom).toHaveBeenCalledWith(12)
  })

  it('đồng bộ phòng lỗi không làm hỏng việc lưu buổi học', async () => {
    lessonMeetingService.syncLessonRoom.mockRejectedValue(new Error('meet sập'))
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    await expect(service.updateLesson(12, await validate(UpdateLessonDto, { title: 'x' }))).resolves.toBeUndefined()
  })
})

describe('PUT room-policy → đồng bộ lại các phòng sắp tới ở nền', () => {
  it('trả kết quả ngay, không chờ đồng bộ', async () => {
    let finish: () => void
    const resync = jest.fn(() => new Promise<void>(resolve => (finish = resolve)))
    const data = { policy: null, defaults: DEFAULT_ROOM_POLICY }
    const settingService: any = { updateRoomPolicy: jest.fn(async () => data) }
    const controller = new HvmMeetSettingController(settingService, { resyncUpcomingRooms: resync } as any)

    await expect(controller.updateRoomPolicy({ policy: null })).resolves.toMatchObject({ data })
    expect(resync).toHaveBeenCalledTimes(1)
    finish()
  })
})
