import { AttendanceStatus } from '@enums/class.enum'
import { HVM_MEET_ATTENDANCE_NOTE_PREFIX, LESSON_TIMEZONE_OFFSET_MINUTES } from './hvm-meet.constants'
import { HvmMeetAttendanceReport, HvmMeetAttendanceStatus, HvmMeetRecordingUrls } from './hvm-meet.types'

/**
 * Các hàm thuần đổi dữ liệu giữa academy và HVM Meet: lịch buổi học, điểm danh, link bản ghi.
 * Tách riêng để test bảng được, không cần DB.
 */

/* ------------------------------ Lịch buổi học ------------------------------ */

/**
 * Ngày học dạng YYYY-MM-DD từ `lesson.start_date`.
 * Dữ liệu cũ có đủ kiểu: "2026-10-26", "26/10/2026", "26-10-2026", hoặc ISO "2026-10-25T17:00:00.000Z"
 * (FE gửi Date đã đổi sang UTC) — ISO thì quy về ngày theo giờ Việt Nam.
 */
export function normalizeLessonDate(value: string | null | undefined): string | null {
  if (!value) return null
  const text = String(value).trim()

  let year: number, month: number, day: number
  if (text.includes('T')) {
    const date = new Date(text)
    if (isNaN(date.getTime())) return null
    const local = new Date(date.getTime() + LESSON_TIMEZONE_OFFSET_MINUTES * 60 * 1000)
    year = local.getUTCFullYear()
    month = local.getUTCMonth() + 1
    day = local.getUTCDate()
  } else {
    const parts = text.split(/[-/]/)
    if (parts.length !== 3) return null
    if (parts[0].length === 4) {
      ;[year, month, day] = parts.map(Number)
    } else if (parts[2].length === 4) {
      ;[day, month, year] = parts.map(Number)
    } else {
      return null
    }
  }

  if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "18:30" | "18:30:00" → số phút trong ngày; sai định dạng → null. */
function parseTimeOfDay(value: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Ngày + giờ theo giờ Việt Nam → ISO UTC. */
function toIsoAtVietnamTime(date: string, minutesOfDay: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const utcMs = Date.UTC(year, month - 1, day, 0, minutesOfDay) - LESSON_TIMEZONE_OFFSET_MINUTES * 60 * 1000
  return new Date(utcMs).toISOString()
}

/**
 * Giờ bắt đầu / kết thúc của buổi học để HVM Meet mở phòng đúng giờ.
 * Thiếu ngày hoặc giờ bắt đầu → null (phòng không giới hạn giờ). Giờ kết thúc không hợp lệ → bỏ.
 */
export function buildLessonSchedule(lesson: { start_date?: string; start_time?: string; end_time?: string }): {
  scheduledStart: string | null
  scheduledEnd: string | null
} {
  const date = normalizeLessonDate(lesson.start_date)
  const start = parseTimeOfDay(lesson.start_time)
  if (!date || start === null) return { scheduledStart: null, scheduledEnd: null }

  const end = parseTimeOfDay(lesson.end_time)
  return {
    scheduledStart: toIsoAtVietnamTime(date, start),
    scheduledEnd: end !== null && end > start ? toIsoAtVietnamTime(date, end) : null,
  }
}

/* ------------------------------ Điểm danh ------------------------------ */

const STATUS_MAP: Record<HvmMeetAttendanceStatus, AttendanceStatus> = {
  present: AttendanceStatus.PRESENT,
  late: AttendanceStatus.LATE,
  absent: AttendanceStatus.ABSENT,
}

export function mapHvmMeetAttendanceStatus(status: string | null | undefined): AttendanceStatus | null {
  return STATUS_MAP[String(status ?? '') as HvmMeetAttendanceStatus] ?? null
}

/** true nếu bản ghi điểm danh do HVM Meet ghi (được phép cập nhật lại khi webhook gửi lại). */
export function isHvmMeetAttendanceNote(note: string | null | undefined): boolean {
  return typeof note === 'string' && note.startsWith(HVM_MEET_ATTENDANCE_NOTE_PREFIX)
}

/**
 * Ghi chú điểm danh cho giáo vụ đọc, ví dụ:
 *   "HVM Meet: có mặt 52/60 phút (87%), điểm danh giữa buổi 2/2"
 *   "HVM Meet: đi trễ 12 phút, có mặt 48/60 phút (80%)"
 *   "HVM Meet: vắng, có mặt 5/60 phút (8%)"
 */
export function buildHvmMeetAttendanceNote(report: HvmMeetAttendanceReport): string {
  const attended = Math.round(Number(report.attendedSeconds || 0) / 60)
  const expected = Math.round(Number(report.expectedSeconds || 0) / 60)
  const percent = Math.round(Number(report.attendancePercent || 0))
  const presence = expected > 0 ? `có mặt ${attended}/${expected} phút (${percent}%)` : `có mặt ${attended} phút`

  const parts: string[] = []
  if (report.status === 'late') parts.push(`đi trễ ${Math.max(0, Math.round(Number(report.lateMinutes || 0)))} phút`)
  if (report.status === 'absent') parts.push('vắng')
  parts.push(presence)
  if (Number(report.checksTotal) > 0) parts.push(`điểm danh giữa buổi ${Number(report.checksPassed || 0)}/${Number(report.checksTotal)}`)

  return `${HVM_MEET_ATTENDANCE_NOTE_PREFIX} ${parts.join(', ')}`
}

/* ------------------------------ Bản ghi hình ------------------------------ */

/**
 * Link phát lại của bản ghi để gắn vào `lesson.video_url`. hvm-home phát video_url trong iframe
 * (LessonVideoPlayer), và video chọn từ kho hvm-storage cũng được lưu bằng `urls.embed`,
 * nên ưu tiên embed, không có thì watch.
 */
export function pickRecordingPlaybackUrl(urls: HvmMeetRecordingUrls | null | undefined): string | null {
  const candidate = urls?.embed || urls?.watch
  return candidate && /^https?:\/\//i.test(candidate) ? candidate : null
}

/** Thêm link vào danh sách video nếu chưa có. Trả về null nếu không cần ghi. */
export function appendVideoUrl(current: string[] | null | undefined, url: string): string[] | null {
  const list = Array.isArray(current) ? current.filter(item => typeof item === 'string') : []
  const normalize = (value: string) => value.trim().replace(/\/+$/, '')
  if (list.some(item => normalize(item) === normalize(url))) return null
  return [...list, url]
}
