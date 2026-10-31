import { createHash } from 'crypto'
import { AttendanceStatus, LearnType } from '@enums/class.enum'

/**
 * Logic thuần (không DB) của điểm danh qua video — tách riêng để test kỹ từng quy tắc.
 *
 * Nguyên tắc đếm: chỉ tính các ĐOẠN video học viên thật sự phát ([start, end] giây), gộp
 * lại thành tập không trùng. Xem lại một đoạn không cộng thêm, tua tới không tạo đoạn nào.
 * Server tự giới hạn số giây được ghi nhận theo thời gian thực trôi qua giữa hai nhịp gửi
 * (x tốc độ phát tối đa) nên client có gửi bậy cũng không "xem" nhanh hơn đồng hồ được.
 */

export type Range = [number, number]

export enum VideoAttendanceMode {
  /** Xem đủ X% thời lượng (không tính phần tua, không tính xem lại) */
  PERCENT = 'PERCENT',
  /** Có xem là được: xem thật tối thiểu N giây */
  ANY_VIEW = 'ANY_VIEW',
}

export enum MultiVideoRule {
  /** Buổi có nhiều video: đạt ở một video bất kỳ là được */
  ANY = 'ANY',
  /** Phải đạt ở tất cả video của buổi */
  ALL = 'ALL',
}

export enum IdleCheckMode {
  /** Chỉ cần bấm "Tôi vẫn đang học" */
  CONFIRM = 'CONFIRM',
  /** Trả lời câu hỏi giảng viên soạn (hết câu hỏi thì quay về CONFIRM) */
  QUESTION = 'QUESTION',
}

export enum QuestionType {
  CHOICE = 'CHOICE',
  TEXT = 'TEXT',
}

export type BlockReason = 'DISABLED' | 'NOT_ELIGIBLE_LEARN_TYPE' | 'NO_ATTENDANCE_RULE' | 'DEADLINE_PASSED' | 'NOT_TRACKABLE'

export interface VideoAttendanceSettings {
  enabled: boolean
  mode: VideoAttendanceMode
  required_percent: number
  min_view_seconds: number
  multi_video_rule: MultiVideoRule
  block_seek_forward: boolean
  max_playback_rate: number
  pause_when_hidden: boolean
  eligible_learn_types: LearnType[]
  late_after_days: number | null
  deadline_days: number | null
  idle_check_enabled: boolean
  idle_check_mode: IdleCheckMode
  idle_check_interval_minutes: number
  idle_check_timeout_seconds: number
  idle_check_max_attempts: number
  idle_check_discard_on_fail: boolean
}

/** Mặc định = hành vi cũ: xem đủ 50%, học VIDEO/MEETING, không kiểm tra treo máy. */
export const DEFAULT_SETTINGS: VideoAttendanceSettings = {
  enabled: true,
  mode: VideoAttendanceMode.PERCENT,
  required_percent: 50,
  min_view_seconds: 60,
  multi_video_rule: MultiVideoRule.ANY,
  block_seek_forward: false,
  max_playback_rate: 2,
  pause_when_hidden: false,
  eligible_learn_types: [LearnType.VIDEO, LearnType.MEETING],
  late_after_days: null,
  deadline_days: null,
  idle_check_enabled: false,
  idle_check_mode: IdleCheckMode.QUESTION,
  idle_check_interval_minutes: 10,
  idle_check_timeout_seconds: 60,
  idle_check_max_attempts: 2,
  idle_check_discard_on_fail: true,
}

/** Hai đoạn cách nhau ít hơn mức này coi như liền nhau (sai số timeupdate). */
const MERGE_GAP_SECONDS = 0.5
/** Thời gian trôi qua tối đa được tính giữa hai nhịp (mạng rớt lâu hơn thì phần dư bỏ). */
export const MAX_ELAPSED_SECONDS = 120
/** Nhịp đầu tiên (chưa có mốc so sánh) được ghi nhận tối đa ngần này giây video. */
export const FIRST_BEAT_ALLOWANCE_SECONDS = 30
/** Dung sai độ trễ mạng / làm tròn. */
export const ALLOWANCE_SLACK_SECONDS = 3
/** Hạn trả lời còn được nới thêm (độ trễ mạng). */
export const CHECK_GRACE_SECONDS = 5

const round1 = (n: number) => Math.round(n * 10) / 10

/** Chuẩn hoá: kẹp vào [0, duration], bỏ đoạn hỏng, sắp xếp, gộp đoạn chồng/sát nhau. */
export function normalizeRanges(ranges: unknown, duration?: number): Range[] {
  if (!Array.isArray(ranges)) return []
  const max = duration && duration > 0 ? duration : Infinity
  const clean: Range[] = []
  for (const r of ranges) {
    if (!Array.isArray(r) || r.length < 2) continue
    let [s, e] = [Number(r[0]), Number(r[1])]
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue
    s = Math.max(0, Math.min(s, max))
    e = Math.max(0, Math.min(e, max))
    if (e - s <= 0) continue
    clean.push([s, e])
  }
  clean.sort((a, b) => a[0] - b[0])
  const merged: Range[] = []
  for (const r of clean) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1] + MERGE_GAP_SECONDS) {
      last[1] = Math.max(last[1], r[1])
    } else {
      merged.push([r[0], r[1]])
    }
  }
  return merged.map(([s, e]) => [round1(s), round1(e)] as Range).filter(([s, e]) => e > s)
}

export function rangesLength(ranges: Range[]): number {
  return round1(ranges.reduce((sum, [s, e]) => sum + (e - s), 0))
}

export function unionRanges(a: Range[], b: Range[], duration?: number): Range[] {
  return normalizeRanges([...a, ...b], duration)
}

/** Phần của `a` không nằm trong `b` (cả hai đã chuẩn hoá). */
export function subtractRanges(a: Range[], b: Range[]): Range[] {
  const out: Range[] = []
  for (const [s0, e0] of a) {
    let pieces: Range[] = [[s0, e0]]
    for (const [bs, be] of b) {
      const next: Range[] = []
      for (const [s, e] of pieces) {
        if (be <= s || bs >= e) {
          next.push([s, e])
          continue
        }
        if (bs > s) next.push([s, bs])
        if (be < e) next.push([be, e])
      }
      pieces = next
    }
    out.push(...pieces)
  }
  return out.filter(([s, e]) => e - s > 0.05)
}

/** Giữ các đoạn theo thứ tự thời gian cho tới khi đủ `maxLength` giây. */
export function trimRangesToLength(ranges: Range[], maxLength: number): Range[] {
  if (maxLength <= 0) return []
  const out: Range[] = []
  let left = maxLength
  for (const [s, e] of ranges) {
    if (left <= 0) break
    const len = e - s
    if (len <= left) {
      out.push([s, e])
      left -= len
    } else {
      out.push([s, round1(s + left)])
      left = 0
    }
  }
  return out.filter(([s, e]) => e > s)
}

export function maxEnd(ranges: Range[]): number {
  return ranges.reduce((m, [, e]) => Math.max(m, e), 0)
}

export interface CreditInput {
  /** Đoạn client báo đã xem (chưa chuẩn hoá) */
  ranges: unknown
  duration: number
  /** Giây đồng hồ thật kể từ nhịp trước của học viên trong buổi này; null = nhịp đầu tiên */
  elapsedSeconds: number | null
  playbackRate?: number
  maxPlaybackRate: number
}

/**
 * Số đoạn được ghi nhận cho một nhịp: bỏ nếu xem nhanh hơn mức cho phép, và cắt bớt nếu
 * tổng độ dài vượt thời gian thật trôi qua x tốc độ tối đa.
 */
export function creditRanges(input: CreditInput): Range[] {
  const maxRate = Math.max(1, input.maxPlaybackRate)
  if (input.playbackRate !== undefined && input.playbackRate > maxRate + 0.01) return []
  const ranges = normalizeRanges(input.ranges, input.duration)
  const allowance =
    input.elapsedSeconds === null
      ? FIRST_BEAT_ALLOWANCE_SECONDS * maxRate
      : Math.min(Math.max(0, input.elapsedSeconds), MAX_ELAPSED_SECONDS) * maxRate + ALLOWANCE_SLACK_SECONDS
  return trimRangesToLength(ranges, allowance)
}

/** Client cũ chỉ gửi watched_delta + current_time → đổi thành đoạn [current - delta, current]. */
export function legacyDeltaToRanges(currentTime: number, delta?: number): Range[] {
  if (!delta || delta <= 0) return []
  return [[Math.max(0, currentTime - delta), currentTime]]
}

export function percentOf(watched: number, duration: number): number {
  if (!(duration > 0)) return 0
  return Math.min(100, round1((watched / duration) * 100))
}

/** Một video đã đạt yêu cầu chưa (chỉ tính phần đã xác nhận). */
export function isVideoComplete(watchedSeconds: number, duration: number, s: VideoAttendanceSettings): boolean {
  if (!(duration > 0) || watchedSeconds <= 0) return false
  if (s.mode === VideoAttendanceMode.ANY_VIEW) {
    return watchedSeconds >= Math.min(Math.max(1, s.min_view_seconds), duration) - 0.05
  }
  return (watchedSeconds / duration) * 100 >= s.required_percent - 1e-9
}

/**
 * Video có theo dõi được thời gian xem không. YouTube / Google Drive chỉ nhúng iframe được,
 * không đọc được thời gian nên không bao giờ là điều kiện điểm danh.
 */
export function isTrackableVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return false
  return !/youtube\.com|youtu\.be|drive\.google\.com/i.test(u)
}

export function videoKeyOf(url: string | null | undefined): string {
  if (!url) return ''
  return createHash('sha1').update(url.trim()).digest('hex')
}

/**
 * Buổi học đã đạt chưa, theo quy tắc nhiều video.
 * `trackableKeys`: video_key các video theo dõi được của buổi, `completeKeys`: video_key đã đạt.
 * ANY tính cả video đã bị gỡ khỏi buổi (giảng viên thay link) — học viên đã xem thật.
 */
export function isLessonComplete(trackableKeys: string[], completeKeys: Set<string>, rule: MultiVideoRule): boolean {
  if (rule === MultiVideoRule.ALL && trackableKeys.length > 0) return trackableKeys.every(k => completeKeys.has(k))
  return completeKeys.size > 0
}

/** Số ngày (theo lịch VN) từ ngày học tới hôm nay; âm = xem trước ngày học. */
export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(`${fromYmd}T00:00:00Z`)
  const b = Date.parse(`${toYmd}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

export function todayInVietnam(now: Date = new Date()): string {
  // en-CA cho định dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)
}

export type AttendanceTarget = { status: AttendanceStatus.PRESENT | AttendanceStatus.LATE } | { blocked: 'DEADLINE_PASSED' }

export function resolveAttendanceTarget(lessonDate: string, today: string, s: VideoAttendanceSettings): AttendanceTarget {
  const days = daysBetween(lessonDate, today)
  if (s.deadline_days !== null && s.deadline_days !== undefined && days > s.deadline_days) {
    return { blocked: 'DEADLINE_PASSED' }
  }
  if (s.late_after_days !== null && s.late_after_days !== undefined && days > s.late_after_days) {
    return { status: AttendanceStatus.LATE }
  }
  return { status: AttendanceStatus.PRESENT }
}

const STATUS_RANK: Record<number, number> = {
  [AttendanceStatus.PRESENT]: 3,
  [AttendanceStatus.LATE]: 2,
  [AttendanceStatus.ABSENT]: 1,
  [AttendanceStatus.EXCUSED_ABSENT]: 1,
}

/** Chỉ nâng trạng thái (vắng → trễ → có mặt), không bao giờ hạ. null = giữ nguyên. */
export function upgradeAttendanceStatus(existing: AttendanceStatus | null | undefined, target: AttendanceStatus): AttendanceStatus | null {
  if (existing === null || existing === undefined) return target
  return (STATUS_RANK[target] ?? 0) > (STATUS_RANK[existing] ?? 0) ? target : null
}

/** So khớp đáp án tự luận: không phân biệt hoa thường, dấu tiếng Việt, khoảng trắng thừa. */
export function normalizeTextAnswer(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CheckQuestion {
  type: QuestionType
  options?: string[] | null
  correct_option?: number | null
  accepted_answers?: string[] | null
}

/** `question` null = kiểm tra kiểu xác nhận, chỉ cần có phản hồi. */
export function isAnswerCorrect(question: CheckQuestion | null, answer: unknown): boolean {
  if (!question) return true
  if (question.type === QuestionType.CHOICE) {
    const idx = typeof answer === 'number' ? answer : Number(answer)
    return Number.isInteger(idx) && idx === question.correct_option
  }
  const given = normalizeTextAnswer(String(answer ?? ''))
  if (!given) return false
  return (question.accepted_answers ?? []).some(a => normalizeTextAnswer(a) === given)
}

/** Mốc kiểm tra kế tiếp: interval ± 20% để học viên không đoán trước được. */
export function nextCheckAfterSeconds(intervalMinutes: number, random: number = Math.random()): number {
  const base = Math.max(1, intervalMinutes) * 60
  return Math.round(base * (0.8 + 0.4 * Math.min(1, Math.max(0, random))))
}

export function parseLearnTypes(value: string | null | undefined): LearnType[] {
  if (!value) return []
  return value
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => [LearnType.OFFLINE, LearnType.VIDEO, LearnType.MEETING].includes(v))
}
