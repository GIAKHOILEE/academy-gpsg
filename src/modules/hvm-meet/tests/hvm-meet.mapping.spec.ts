import { AttendanceStatus } from '@enums/class.enum'
import {
  appendVideoUrl,
  buildHvmMeetAttendanceNote,
  buildLessonSchedule,
  isHvmMeetAttendanceNote,
  mapHvmMeetAttendanceStatus,
  normalizeLessonDate,
  pickRecordingPlaybackUrl,
} from '../hvm-meet.mapping'
import { lessonExternalId, parseLessonExternalId } from '../hvm-meet.constants'
import { HvmMeetAttendanceReport } from '../hvm-meet.types'

const report = (overrides: Partial<HvmMeetAttendanceReport> = {}): HvmMeetAttendanceReport => ({
  identity: 'academy:user:15',
  externalUserId: '15',
  name: 'Giuse Nguyễn Văn A',
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

describe('hvm-meet.mapping', () => {
  describe('externalId của buổi học', () => {
    it('lesson-<id> hai chiều', () => {
      expect(lessonExternalId(12)).toBe('lesson-12')
      expect(parseLessonExternalId('lesson-12')).toBe(12)
    })

    it.each(['lesson-', 'lesson-abc', 'class-12', 'lesson-0', '', null])('"%s" không phải phòng buổi học', value => {
      expect(parseLessonExternalId(value as string)).toBeNull()
    })
  })

  describe('normalizeLessonDate', () => {
    it.each([
      ['2026-10-26', '2026-10-26'],
      ['26/10/2026', '2026-10-26'],
      ['26-10-2026', '2026-10-26'],
      ['2026/10/26', '2026-10-26'],
      // FE gửi new Date(...).toISOString(): 00:00 giờ VN = 17:00 UTC hôm trước
      ['2026-10-25T17:00:00.000Z', '2026-10-26'],
    ])('%s → %s', (input, expected) => {
      expect(normalizeLessonDate(input)).toBe(expected)
    })

    it.each(['', null, 'hôm nay', '2026-13-01', '10/2026'])('"%s" → null', input => {
      expect(normalizeLessonDate(input as string)).toBeNull()
    })
  })

  describe('buildLessonSchedule (giờ Việt Nam → ISO UTC)', () => {
    it('ngày + giờ bắt đầu/kết thúc', () => {
      expect(buildLessonSchedule({ start_date: '26/10/2026', start_time: '18:30', end_time: '20:00' })).toEqual({
        scheduledStart: '2026-10-26T11:30:00.000Z',
        scheduledEnd: '2026-10-26T13:00:00.000Z',
      })
    })

    it('giờ kết thúc sai hoặc trước giờ bắt đầu thì bỏ giờ kết thúc', () => {
      expect(buildLessonSchedule({ start_date: '2026-10-26', start_time: '18:30', end_time: '17:00' }).scheduledEnd).toBeNull()
      expect(buildLessonSchedule({ start_date: '2026-10-26', start_time: '18:30', end_time: 'tối' }).scheduledEnd).toBeNull()
    })

    it('thiếu ngày hoặc giờ bắt đầu thì phòng không giới hạn giờ', () => {
      expect(buildLessonSchedule({ start_time: '18:30' })).toEqual({ scheduledStart: null, scheduledEnd: null })
      expect(buildLessonSchedule({ start_date: '2026-10-26' })).toEqual({ scheduledStart: null, scheduledEnd: null })
    })
  })

  describe('điểm danh', () => {
    it.each([
      ['present', AttendanceStatus.PRESENT],
      ['late', AttendanceStatus.LATE],
      ['absent', AttendanceStatus.ABSENT],
      ['excused', null],
    ])('trạng thái %s → %s', (status, expected) => {
      expect(mapHvmMeetAttendanceStatus(status)).toBe(expected)
    })

    it('ghi chú có mặt', () => {
      expect(buildHvmMeetAttendanceNote(report())).toBe('HVM Meet: có mặt 52/60 phút (87%), điểm danh giữa buổi 2/2')
    })

    it('ghi chú đi trễ và vắng', () => {
      expect(buildHvmMeetAttendanceNote(report({ status: 'late', lateMinutes: 12, attendedSeconds: 2880, attendancePercent: 80 }))).toBe(
        'HVM Meet: đi trễ 12 phút, có mặt 48/60 phút (80%), điểm danh giữa buổi 2/2',
      )
      expect(buildHvmMeetAttendanceNote(report({ status: 'absent', attendedSeconds: 300, attendancePercent: 8.33, checksTotal: 0 }))).toBe(
        'HVM Meet: vắng, có mặt 5/60 phút (8%)',
      )
    })

    it('nhận ra ghi chú do HVM Meet ghi, mọi ghi chú khác coi là điểm danh tay', () => {
      expect(isHvmMeetAttendanceNote('HVM Meet: có mặt 52/60 phút (87%)')).toBe(true)
      expect(isHvmMeetAttendanceNote('Điểm danh tự động qua video (hoàn thành >= 50%)')).toBe(false)
      expect(isHvmMeetAttendanceNote('xin phép nghỉ')).toBe(false)
      expect(isHvmMeetAttendanceNote(null)).toBe(false)
    })
  })

  describe('link bản ghi', () => {
    const urls = {
      file: 'https://video.test/f/1.mp4',
      embed: 'https://app.test/embed/abc',
      watch: 'https://app.test/watch/abc',
      download: 'https://app.test/d/abc',
      poster: null,
    }

    it('ưu tiên embed (hvm-home phát video_url trong iframe), không có thì watch', () => {
      expect(pickRecordingPlaybackUrl(urls)).toBe('https://app.test/embed/abc')
      expect(pickRecordingPlaybackUrl({ ...urls, embed: null })).toBe('https://app.test/watch/abc')
      expect(pickRecordingPlaybackUrl({ file: urls.file })).toBeNull()
      expect(pickRecordingPlaybackUrl(null)).toBeNull()
    })

    it('thêm vào cuối danh sách video nếu chưa có', () => {
      expect(appendVideoUrl(['https://youtu.be/x'], urls.embed)).toEqual(['https://youtu.be/x', urls.embed])
      expect(appendVideoUrl(null, urls.embed)).toEqual([urls.embed])
    })

    it('đã có (kể cả khác dấu / cuối) thì không thêm lần nữa', () => {
      expect(appendVideoUrl([urls.embed], urls.embed)).toBeNull()
      expect(appendVideoUrl([`${urls.embed}/`], urls.embed)).toBeNull()
    })
  })
})
