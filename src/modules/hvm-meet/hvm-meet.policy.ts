/**
 * Chính sách phòng HVM Meet của buổi học: cách vào phòng (link công khai) và điểm danh tự động.
 *
 * academy là nơi DUY NHẤT giáo vụ chỉnh các giá trị này (mặc định chung → ghi đè theo buổi học),
 * rồi đẩy sang HVM Meet thành setting cấp phòng (room scope) mỗi lần upsert phòng.
 * File thuần, không đụng DB, để test bảng được.
 */

export type MeetAccessMode = 'account' | 'account_or_code_birthdate' | 'account_or_code' | 'account_or_guest'

export const MEET_ACCESS_MODES: readonly MeetAccessMode[] = ['account', 'account_or_code_birthdate', 'account_or_code', 'account_or_guest']

export type MeetCheckMode = 'button' | 'code'

export const MEET_CHECK_MODES: readonly MeetCheckMode[] = ['button', 'code']

export interface MeetAccessPolicy {
  mode: MeetAccessMode
  /** Chỉ có tác dụng ở mode account_or_guest: khách vào bằng link mở phải chờ duyệt. */
  guest_waiting_room: boolean
  /** Phòng chờ cho mọi người (chủ phòng / trợ giảng bỏ qua). */
  waiting_room: boolean
  /** 0–1440 */
  join_early_minutes: number
  /** 0–1440, 0 = không giới hạn */
  join_cutoff_minutes: number
  allow_two_devices: boolean
}

export interface MeetAttendancePolicy {
  enabled: boolean
  /** 0–100 */
  present_percent: number
  /** 0–600 */
  late_after_minutes: number
  /** 0–3600 */
  grace_seconds: number
  /** 0–20 */
  random_check_count: number
  check_mode: MeetCheckMode
  /** 10–600 */
  check_duration_seconds: number
  /** 0–100 */
  min_checks_percent: number
}

/** Mặc định chung (trang Phòng học trực tuyến): cả hai phần đều bắt buộc. */
export interface HvmMeetRoomPolicy {
  access: MeetAccessPolicy
  attendance: MeetAttendancePolicy
}

/** Ghi đè theo buổi học, từng phần: null / thiếu = theo cấu hình chung. */
export interface LessonMeetPolicy {
  access?: MeetAccessPolicy | null
  attendance?: MeetAttendancePolicy | null
}

export interface ResolvedMeetPolicy {
  access: MeetAccessPolicy | null
  attendance: MeetAttendancePolicy | null
}

/** Khoảng giá trị hợp lệ — bằng đúng catalog setting của HVM Meet để meet không bao giờ từ chối. */
export const MEET_POLICY_RANGES = {
  join_early_minutes: { min: 0, max: 1440 },
  join_cutoff_minutes: { min: 0, max: 1440 },
  present_percent: { min: 0, max: 100 },
  late_after_minutes: { min: 0, max: 600 },
  grace_seconds: { min: 0, max: 3600 },
  random_check_count: { min: 0, max: 20 },
  check_duration_seconds: { min: 10, max: 600 },
  min_checks_percent: { min: 0, max: 100 },
} as const

/** = giá trị mặc định trong catalog của HVM Meet (mode account = hành vi trước đây). */
export const DEFAULT_ROOM_POLICY: HvmMeetRoomPolicy = Object.freeze({
  access: Object.freeze({
    mode: 'account',
    guest_waiting_room: true,
    waiting_room: false,
    join_early_minutes: 15,
    join_cutoff_minutes: 0,
    allow_two_devices: false,
  }),
  attendance: Object.freeze({
    enabled: true,
    present_percent: 70,
    late_after_minutes: 10,
    grace_seconds: 120,
    random_check_count: 0,
    check_mode: 'button',
    check_duration_seconds: 60,
    min_checks_percent: 0,
  }),
}) as HvmMeetRoomPolicy

/**
 * Các key HVM Meet do academy quản lý cho phòng buổi học. Luôn gửi đủ, null = bỏ giá trị cấp phòng
 * (về giá trị kế thừa của meet). Không được khoá các key này ở cấp system/app/template bên meet,
 * nếu không giá trị của academy bị bỏ qua im lặng.
 */
export const MANAGED_MEET_KEYS: readonly string[] = Object.freeze([
  'room.publicJoin',
  'room.publicJoinFactor',
  'room.guestWaitingRoom',
  'room.waitingRoom',
  'room.joinEarlyMinutes',
  'room.joinCutoffMinutes',
  'room.allowSameIdentityTwice',
  'attendance.enabled',
  'attendance.presentThresholdPercent',
  'attendance.lateAfterMinutes',
  'attendance.gracePeriodSeconds',
  'attendance.check.randomCount',
  'attendance.check.mode',
  'attendance.check.durationSeconds',
  'attendance.minChecksPassedPercent',
])

/** mode của academy → cặp room.publicJoin / room.publicJoinFactor bên meet. */
const ACCESS_MODE_TO_MEET: Record<MeetAccessMode, { publicJoin: boolean; factor: 'birthdate' | 'none' | 'guest' | null }> = {
  account: { publicJoin: false, factor: null },
  account_or_code_birthdate: { publicJoin: true, factor: 'birthdate' },
  account_or_code: { publicJoin: true, factor: 'none' },
  account_or_guest: { publicJoin: true, factor: 'guest' },
}

/** factor tương ứng của mode (null với account), dùng khi meet cũ chưa trả `factor`. */
export function meetFactorOfMode(mode: MeetAccessMode | null | undefined): 'birthdate' | 'none' | 'guest' | null {
  return ACCESS_MODE_TO_MEET[mode as MeetAccessMode]?.factor ?? null
}

/** Mỗi phần: buổi học ghi đè ?? mặc định chung ?? null (null = để meet dùng giá trị kế thừa). */
export function resolveSections(global: HvmMeetRoomPolicy | null | undefined, lesson: LessonMeetPolicy | null | undefined): ResolvedMeetPolicy {
  return {
    access: lesson?.access ?? global?.access ?? null,
    attendance: lesson?.attendance ?? global?.attendance ?? null,
  }
}

/** Đổi chính sách đã gộp sang setting cấp phòng của meet. Luôn trả đủ MANAGED_MEET_KEYS. */
export function toMeetSettings(resolved: ResolvedMeetPolicy | null | undefined): Record<string, unknown> {
  const access = resolved?.access ?? null
  const attendance = resolved?.attendance ?? null
  const pair = access ? ACCESS_MODE_TO_MEET[access.mode] : null
  const value = <T>(section: object | null, v: T): T | null => (section ? (v ?? null) : null)

  return {
    'room.publicJoin': pair ? pair.publicJoin : null,
    'room.publicJoinFactor': pair ? pair.factor : null,
    'room.guestWaitingRoom': value(access, access?.guest_waiting_room),
    'room.waitingRoom': value(access, access?.waiting_room),
    'room.joinEarlyMinutes': value(access, access?.join_early_minutes),
    'room.joinCutoffMinutes': value(access, access?.join_cutoff_minutes),
    'room.allowSameIdentityTwice': value(access, access?.allow_two_devices),
    'attendance.enabled': value(attendance, attendance?.enabled),
    'attendance.presentThresholdPercent': value(attendance, attendance?.present_percent),
    'attendance.lateAfterMinutes': value(attendance, attendance?.late_after_minutes),
    'attendance.gracePeriodSeconds': value(attendance, attendance?.grace_seconds),
    'attendance.check.randomCount': value(attendance, attendance?.random_check_count),
    'attendance.check.mode': value(attendance, attendance?.check_mode),
    'attendance.check.durationSeconds': value(attendance, attendance?.check_duration_seconds),
    'attendance.minChecksPassedPercent': value(attendance, attendance?.min_checks_percent),
  }
}

/* ------------------- Chuẩn hoá trước khi lưu / sau khi đọc ------------------- */

const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Chỉ giữ đúng các trường của phần "cách vào phòng" (bỏ trường lạ, đổi instance DTO thành object thường). */
export function pickAccessPolicy(v: unknown): MeetAccessPolicy | null {
  if (!isObject(v) || !MEET_ACCESS_MODES.includes(v.mode)) return null
  return {
    mode: v.mode,
    guest_waiting_room: Boolean(v.guest_waiting_room ?? DEFAULT_ROOM_POLICY.access.guest_waiting_room),
    waiting_room: Boolean(v.waiting_room ?? DEFAULT_ROOM_POLICY.access.waiting_room),
    join_early_minutes: Number(v.join_early_minutes ?? DEFAULT_ROOM_POLICY.access.join_early_minutes),
    join_cutoff_minutes: Number(v.join_cutoff_minutes ?? DEFAULT_ROOM_POLICY.access.join_cutoff_minutes),
    allow_two_devices: Boolean(v.allow_two_devices ?? DEFAULT_ROOM_POLICY.access.allow_two_devices),
  }
}

/** Chỉ giữ đúng các trường của phần "điểm danh tự động". */
export function pickAttendancePolicy(v: unknown): MeetAttendancePolicy | null {
  if (!isObject(v)) return null
  const d = DEFAULT_ROOM_POLICY.attendance
  return {
    enabled: Boolean(v.enabled ?? d.enabled),
    present_percent: Number(v.present_percent ?? d.present_percent),
    late_after_minutes: Number(v.late_after_minutes ?? d.late_after_minutes),
    grace_seconds: Number(v.grace_seconds ?? d.grace_seconds),
    random_check_count: Number(v.random_check_count ?? d.random_check_count),
    check_mode: MEET_CHECK_MODES.includes(v.check_mode) ? v.check_mode : d.check_mode,
    check_duration_seconds: Number(v.check_duration_seconds ?? d.check_duration_seconds),
    min_checks_percent: Number(v.min_checks_percent ?? d.min_checks_percent),
  }
}

/** Mặc định chung: thiếu một phần thì coi như chưa lưu (null). */
export function normalizeRoomPolicy(v: unknown): HvmMeetRoomPolicy | null {
  if (!isObject(v)) return null
  const access = pickAccessPolicy(v.access)
  const attendance = pickAttendancePolicy(v.attendance)
  return access && attendance ? { access, attendance } : null
}

/** Ghi đè theo buổi học: cả hai phần null → null (theo cấu hình chung hoàn toàn). */
export function normalizeLessonMeetPolicy(v: unknown): LessonMeetPolicy | null {
  if (!isObject(v)) return null
  const access = pickAccessPolicy(v.access)
  const attendance = pickAttendancePolicy(v.attendance)
  return access || attendance ? { access, attendance } : null
}
