import { Role } from '@enums/role.enum'
import { HttpException, PayloadTooLargeException } from '@nestjs/common'
import { UploadGuardService } from './upload-guard.service'
import { DEDUPE_WINDOW_MS, RATE_LIMIT_BYTES, RATE_LIMIT_UPLOADS } from './upload-limits'

const MB = 1024 * 1024

const file = (size: number, name = 'a.png', content?: string): Express.Multer.File =>
  ({
    originalname: name,
    size,
    buffer: Buffer.from(content ?? `content-${name}-${size}`),
    mimetype: 'image/png',
  }) as unknown as Express.Multer.File

describe('UploadGuardService', () => {
  let guard: UploadGuardService
  let now: number

  const student = { userId: 1, role: Role.STUDENT }
  const admin = { userId: 2, role: Role.ADMIN }

  beforeEach(() => {
    guard = new UploadGuardService()
    now = 1_700_000_000_000
    guard.now = () => now
  })

  describe('kích thước theo vai trò', () => {
    it('học viên/giảng viên bị chặn ở 25 MB, quản trị tới 500 MB', () => {
      expect(() => guard.assertSizes(student, [file(25 * MB)])).not.toThrow()
      expect(() => guard.assertSizes(student, [file(25 * MB + 1)])).toThrow(PayloadTooLargeException)
      expect(() => guard.assertSizes({ userId: 3, role: Role.TEACHER }, [file(26 * MB)])).toThrow(/vượt mức cho phép 25 MB/)

      expect(() => guard.assertSizes(admin, [file(400 * MB)])).not.toThrow()
      expect(() => guard.assertSizes(admin, [file(500 * MB + 1)])).toThrow(PayloadTooLargeException)
    })

    it('vai trò lạ áp mức thấp nhất', () => {
      expect(() => guard.assertSizes({ userId: 9, role: 42 }, [file(26 * MB)])).toThrow(PayloadTooLargeException)
    })

    it('batch của người không phải quản trị tối đa 20 file, quản trị 100', () => {
      const twentyOne = Array.from({ length: 21 }, (_, i) => file(10, `f${i}.png`))
      expect(() => guard.assertSizes(student, twentyOne)).toThrow(/tối đa 20 file/)
      expect(() => guard.assertSizes(student, twentyOne.slice(0, 20))).not.toThrow()
      expect(() => guard.assertSizes(admin, twentyOne)).not.toThrow()
    })
  })

  describe('tần suất theo người dùng (cửa sổ trượt)', () => {
    it(`lần thứ ${RATE_LIMIT_UPLOADS.max + 1} trong cửa sổ bị 429 với thông báo tiếng Việt`, () => {
      for (let i = 0; i < RATE_LIMIT_UPLOADS.max; i++) {
        guard.assertRate(student, [file(10)])
        guard.record(student, [file(10)])
        now += 1000
      }

      let caught: HttpException
      try {
        guard.assertRate(student, [file(10)])
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(HttpException)
      expect(caught.getStatus()).toBe(429)
      expect((caught.getResponse() as any).message).toMatch(/quá 30 lần trong 10 phút/)
      expect((caught.getResponse() as any).retryAfterSeconds).toBeGreaterThan(0)
    })

    it('mở lại khi sự kiện cũ rơi khỏi cửa sổ', () => {
      for (let i = 0; i < RATE_LIMIT_UPLOADS.max; i++) guard.record(student, [file(10)])
      expect(() => guard.assertRate(student, [file(10)])).toThrow(HttpException)

      now += RATE_LIMIT_UPLOADS.windowMs
      expect(() => guard.assertRate(student, [file(10)])).not.toThrow()
    })

    it('tính cả lô đang xin tải: 25 đã tải + lô 6 file => 429', () => {
      for (let i = 0; i < 25; i++) guard.record(student, [file(10)])
      expect(() =>
        guard.assertRate(
          student,
          Array.from({ length: 6 }, () => file(10)),
        ),
      ).toThrow(HttpException)
      expect(() =>
        guard.assertRate(
          student,
          Array.from({ length: 5 }, () => file(10)),
        ),
      ).not.toThrow()
    })

    it('tổng byte trong 1 giờ vượt 300 MB => 429 dù số lần còn ít', () => {
      guard.record(admin, [file(200 * MB)])
      expect(() => guard.assertRate(admin, [file(99 * MB)])).not.toThrow()
      expect(() => guard.assertRate(admin, [file(101 * MB)])).toThrow(/quá 300 MB trong 1 giờ/)

      now += RATE_LIMIT_BYTES.windowMs
      expect(() => guard.assertRate(admin, [file(101 * MB)])).not.toThrow()
    })

    it('đếm riêng từng người dùng', () => {
      for (let i = 0; i < RATE_LIMIT_UPLOADS.max; i++) guard.record(student, [file(10)])
      expect(() => guard.assertRate(admin, [file(10)])).not.toThrow()
    })
  })

  describe('chống gửi lặp', () => {
    it('cùng người dùng, cùng nội dung trong 10 phút => trả URL cũ', () => {
      const f = file(10, 'a.png', 'giong nhau')
      const hash = guard.hashOf(f)
      expect(hash).toBe(guard.hashOf(file(99, 'khac-ten.png', 'giong nhau')))

      expect(guard.findDuplicate(student, hash)).toBeNull()
      guard.remember(student, hash, 'https://video/f/1/a.png')

      now += DEDUPE_WINDOW_MS - 1
      expect(guard.findDuplicate(student, hash)).toBe('https://video/f/1/a.png')
    })

    it('hết 10 phút thì không còn coi là lặp', () => {
      const hash = guard.hashOf(file(10))
      guard.remember(student, hash, 'u')

      now += DEDUPE_WINDOW_MS
      expect(guard.findDuplicate(student, hash)).toBeNull()
    })

    it('người khác gửi cùng nội dung thì không bị coi là lặp', () => {
      const hash = guard.hashOf(file(10))
      guard.remember(student, hash, 'u')

      expect(guard.findDuplicate(admin, hash)).toBeNull()
    })
  })
})
