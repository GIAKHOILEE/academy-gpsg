import { AttendanceStatus } from '@enums/class.enum'
import {
  DEFAULT_SETTINGS,
  MultiVideoRule,
  QuestionType,
  VideoAttendanceMode,
  creditRanges,
  daysBetween,
  isAnswerCorrect,
  isLessonComplete,
  isTrackableVideoUrl,
  isVideoComplete,
  legacyDeltaToRanges,
  nextCheckAfterSeconds,
  normalizeRanges,
  parseLearnTypes,
  rangesLength,
  resolveAttendanceTarget,
  subtractRanges,
  todayInVietnam,
  trimRangesToLength,
  unionRanges,
  upgradeAttendanceStatus,
  videoKeyOf,
} from './video-attendance.logic'

const s = (over: Partial<typeof DEFAULT_SETTINGS> = {}) => ({ ...DEFAULT_SETTINGS, ...over })

describe('video-attendance.logic', () => {
  describe('normalizeRanges', () => {
    it('gộp đoạn chồng nhau và sát nhau, sắp xếp', () => {
      expect(
        normalizeRanges([
          [20, 30],
          [0, 10],
          [10.3, 15],
          [25, 40],
        ]),
      ).toEqual([
        [0, 15],
        [20, 40],
      ])
    })
    it('kẹp vào [0, duration] và bỏ đoạn hỏng', () => {
      expect(normalizeRanges([[-5, 3], [90, 150], [50, 40], ['x', 2], [NaN, 3], 7], 100)).toEqual([
        [0, 3],
        [90, 100],
      ])
    })
    it('không phải mảng → rỗng', () => {
      expect(normalizeRanges(null)).toEqual([])
      expect(normalizeRanges('[[0,1]]')).toEqual([])
    })
  })

  describe('xem lại không cộng thêm', () => {
    it('union của đoạn đã xem với chính nó giữ nguyên độ dài', () => {
      const watched = normalizeRanges([[0, 300]])
      const again = unionRanges(watched, [[0, 300]])
      expect(rangesLength(again)).toBe(300)
    })
    it('xem 25% đầu hai lần vẫn chỉ là 25%', () => {
      const d = 400
      let watched = unionRanges([], [[0, 100]], d)
      watched = unionRanges(watched, [[0, 100]], d)
      expect(rangesLength(watched) / d).toBe(0.25)
      expect(isVideoComplete(rangesLength(watched), d, s())).toBe(false)
    })
  })

  describe('subtractRanges', () => {
    it('lấy phần mới chưa xem', () => {
      expect(subtractRanges([[0, 100]], [[20, 30], [50, 60]])).toEqual([
        [0, 20],
        [30, 50],
        [60, 100],
      ])
      expect(subtractRanges([[10, 20]], [[0, 100]])).toEqual([])
    })
  })

  describe('trimRangesToLength', () => {
    it('cắt theo thứ tự thời gian', () => {
      expect(trimRangesToLength([[0, 10], [20, 30]], 15)).toEqual([
        [0, 10],
        [20, 25],
      ])
      expect(trimRangesToLength([[0, 10]], 0)).toEqual([])
    })
  })

  describe('creditRanges — chống gian lận theo đồng hồ server', () => {
    it('nhịp bình thường được tính đủ', () => {
      expect(creditRanges({ ranges: [[0, 10]], duration: 600, elapsedSeconds: 10, maxPlaybackRate: 2 })).toEqual([[0, 10]])
    })
    it('gửi 1 giờ video sau 10 giây thật → chỉ tính 10*2+3 giây', () => {
      const out = creditRanges({ ranges: [[0, 3600]], duration: 3600, elapsedSeconds: 10, maxPlaybackRate: 2 })
      expect(rangesLength(out)).toBe(23)
    })
    it('xem nhanh hơn mức cho phép → không tính', () => {
      expect(creditRanges({ ranges: [[0, 10]], duration: 600, elapsedSeconds: 10, playbackRate: 3, maxPlaybackRate: 2 })).toEqual([])
    })
    it('nhịp đầu tiên có trần riêng', () => {
      const out = creditRanges({ ranges: [[0, 600]], duration: 600, elapsedSeconds: null, maxPlaybackRate: 1 })
      expect(rangesLength(out)).toBe(30)
    })
    it('mạng rớt lâu: thời gian trôi qua bị chặn ở 120 giây', () => {
      const out = creditRanges({ ranges: [[0, 3600]], duration: 3600, elapsedSeconds: 10_000, maxPlaybackRate: 1 })
      expect(rangesLength(out)).toBe(123)
    })
  })

  it('legacyDeltaToRanges', () => {
    expect(legacyDeltaToRanges(50, 10)).toEqual([[40, 50]])
    expect(legacyDeltaToRanges(5, 10)).toEqual([[0, 5]])
    expect(legacyDeltaToRanges(5, 0)).toEqual([])
  })

  describe('isVideoComplete', () => {
    it('PERCENT', () => {
      expect(isVideoComplete(299.9, 600, s())).toBe(false)
      expect(isVideoComplete(300, 600, s())).toBe(true)
      expect(isVideoComplete(540, 600, s({ required_percent: 90 }))).toBe(true)
      expect(isVideoComplete(0, 0, s())).toBe(false)
    })
    it('ANY_VIEW: có xem N giây là được, video ngắn hơn N thì xem hết', () => {
      const any = s({ mode: VideoAttendanceMode.ANY_VIEW, min_view_seconds: 60 })
      expect(isVideoComplete(59, 3600, any)).toBe(false)
      expect(isVideoComplete(60, 3600, any)).toBe(true)
      expect(isVideoComplete(30, 30, any)).toBe(true)
      expect(isVideoComplete(0, 3600, any)).toBe(false)
    })
  })

  describe('isLessonComplete', () => {
    it('ANY: một video bất kỳ', () => {
      expect(isLessonComplete(['a', 'b'], new Set(['b']), MultiVideoRule.ANY)).toBe(true)
      expect(isLessonComplete(['a', 'b'], new Set(), MultiVideoRule.ANY)).toBe(false)
    })
    it('ALL: tất cả video theo dõi được', () => {
      expect(isLessonComplete(['a', 'b'], new Set(['a']), MultiVideoRule.ALL)).toBe(false)
      expect(isLessonComplete(['a', 'b'], new Set(['a', 'b']), MultiVideoRule.ALL)).toBe(true)
    })
    it('không có video theo dõi được → dựa vào dòng tiến độ có sẵn', () => {
      expect(isLessonComplete([], new Set(['']), MultiVideoRule.ALL)).toBe(true)
    })
  })

  it('isTrackableVideoUrl', () => {
    expect(isTrackableVideoUrl('https://app.hvmvsaigon.edu.vn/embed/abc')).toBe(true)
    expect(isTrackableVideoUrl('https://video.hvmvsaigon.edu.vn/f/1/a.mp4')).toBe(true)
    expect(isTrackableVideoUrl('https://www.youtube.com/watch?v=x')).toBe(false)
    expect(isTrackableVideoUrl('https://youtu.be/x')).toBe(false)
    expect(isTrackableVideoUrl('https://drive.google.com/file/d/x/view')).toBe(false)
    expect(isTrackableVideoUrl('')).toBe(false)
    expect(isTrackableVideoUrl('abc')).toBe(false)
  })

  it('videoKeyOf ổn định, bỏ khoảng trắng', () => {
    expect(videoKeyOf('https://x/embed/a')).toBe(videoKeyOf('  https://x/embed/a '))
    expect(videoKeyOf('https://x/embed/a')).toHaveLength(40)
    expect(videoKeyOf(undefined)).toBe('')
  })

  describe('ngày & trạng thái', () => {
    it('daysBetween', () => {
      expect(daysBetween('2026-10-07', '2026-10-07')).toBe(0)
      expect(daysBetween('2026-10-07', '2026-10-10')).toBe(3)
      expect(daysBetween('2026-10-07', '2026-10-01')).toBe(-6)
      expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3)
    })
    it('todayInVietnam dùng giờ VN', () => {
      // 18:00 UTC = 01:00 hôm sau ở VN
      expect(todayInVietnam(new Date('2026-10-31T18:00:00Z'))).toBe('2026-11-01')
      expect(todayInVietnam(new Date('2026-10-31T16:59:00Z'))).toBe('2026-10-31')
    })
    it('resolveAttendanceTarget', () => {
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-20', s())).toEqual({ status: AttendanceStatus.PRESENT })
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-09', s({ late_after_days: 1 }))).toEqual({ status: AttendanceStatus.LATE })
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-08', s({ late_after_days: 1 }))).toEqual({ status: AttendanceStatus.PRESENT })
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-15', s({ deadline_days: 7 }))).toEqual({ blocked: 'DEADLINE_PASSED' })
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-14', s({ deadline_days: 7 }))).toEqual({ status: AttendanceStatus.PRESENT })
      expect(resolveAttendanceTarget('2026-10-07', '2026-10-07', s({ late_after_days: 0, deadline_days: 0 }))).toEqual({
        status: AttendanceStatus.PRESENT,
      })
    })
    it('chỉ nâng trạng thái, không hạ', () => {
      expect(upgradeAttendanceStatus(null, AttendanceStatus.PRESENT)).toBe(AttendanceStatus.PRESENT)
      expect(upgradeAttendanceStatus(AttendanceStatus.ABSENT, AttendanceStatus.LATE)).toBe(AttendanceStatus.LATE)
      expect(upgradeAttendanceStatus(AttendanceStatus.EXCUSED_ABSENT, AttendanceStatus.PRESENT)).toBe(AttendanceStatus.PRESENT)
      expect(upgradeAttendanceStatus(AttendanceStatus.LATE, AttendanceStatus.PRESENT)).toBe(AttendanceStatus.PRESENT)
      expect(upgradeAttendanceStatus(AttendanceStatus.PRESENT, AttendanceStatus.LATE)).toBeNull()
      expect(upgradeAttendanceStatus(AttendanceStatus.PRESENT, AttendanceStatus.PRESENT)).toBeNull()
    })
  })

  describe('isAnswerCorrect', () => {
    it('xác nhận: luôn đúng', () => {
      expect(isAnswerCorrect(null, undefined)).toBe(true)
    })
    it('trắc nghiệm theo chỉ số (số hoặc chuỗi số)', () => {
      const q = { type: QuestionType.CHOICE, options: ['a', 'b'], correct_option: 1 }
      expect(isAnswerCorrect(q, 1)).toBe(true)
      expect(isAnswerCorrect(q, '1')).toBe(true)
      expect(isAnswerCorrect(q, 0)).toBe(false)
      expect(isAnswerCorrect(q, 'b')).toBe(false)
      expect(isAnswerCorrect(q, undefined)).toBe(false)
    })
    it('tự luận: không phân biệt hoa thường, dấu, khoảng trắng', () => {
      const q = { type: QuestionType.TEXT, accepted_answers: ['Chúa Giêsu', 'Đức Kitô'] }
      expect(isAnswerCorrect(q, '  chua   giesu ')).toBe(true)
      expect(isAnswerCorrect(q, 'DUC KITO')).toBe(true)
      expect(isAnswerCorrect(q, 'Giêsu')).toBe(false)
      expect(isAnswerCorrect(q, '')).toBe(false)
    })
  })

  it('nextCheckAfterSeconds trong khoảng ±20%', () => {
    expect(nextCheckAfterSeconds(10, 0)).toBe(480)
    expect(nextCheckAfterSeconds(10, 1)).toBe(720)
    expect(nextCheckAfterSeconds(10, 0.5)).toBe(600)
  })

  it('parseLearnTypes', () => {
    expect(parseLearnTypes('2,3')).toEqual([2, 3])
    expect(parseLearnTypes('1, 9,x')).toEqual([1])
    expect(parseLearnTypes('')).toEqual([])
  })
})
