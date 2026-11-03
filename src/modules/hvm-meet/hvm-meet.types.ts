import { HvmMeetRole } from '@enums/meeting.enum'

/* ------------------------------------------------------------------ *
 *  DTO theo hợp đồng hvm-meet/apps/server/api/openapi.yaml (tag integration)
 * ------------------------------------------------------------------ */

export interface HvmMeetIntegrationMe {
  id: string
  slug: string
  name: string
  allowedOrigins: string[]
}

export interface HvmMeetRosterEntry {
  identity: string
  name: string
  roleKey: HvmMeetRole | string
  externalUserId?: string
}

export interface HvmMeetUpsertRoomRequest {
  title: string
  templateKey?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  metadata?: Record<string, any>
  settings?: Record<string, any>
  roster?: HvmMeetRosterEntry[]
}

export interface HvmMeetRoom {
  id: string
  appId: string
  externalId: string
  title: string
  status: 'scheduled' | 'live' | 'ended' | 'closed'
  locked: boolean
  scheduledStart?: string | null
  scheduledEnd?: string | null
  metadata: Record<string, any>
  createdAt: string
}

export interface HvmMeetCreateTicketRequest {
  identity: string
  name: string
  roleKey: HvmMeetRole | string
  externalUserId?: string
  avatarUrl?: string
  metadata?: Record<string, any>
}

export interface HvmMeetTicket {
  ticket: string
  joinUrl: string
  expiresAt: string
}

export interface HvmMeetSession {
  id: string
  roomId: string
  roomTitle?: string
  startedAt: string
  endedAt?: string | null
  peakParticipants: number
  participantCount: number
  attendanceFinalizedAt?: string | null
}

export interface HvmMeetReplayTicketRequest {
  /** Người xem, ghi vào nhật ký bên HVM Meet */
  identity?: string
  name?: string
}

/**
 * Biên bản đầy đủ của một buổi (GET /v1/integration/sessions/{id}/archive): người tham gia,
 * trò chuyện, dòng thời gian (cảm xúc, giơ tay, chia sẻ màn hình...), bình chọn, điểm danh, bản ghi.
 * academy chỉ chuyển tiếp cho trang quản trị nên giữ kiểu lỏng.
 */
export interface HvmMeetSessionArchive {
  session: HvmMeetSession
  room: { id: string; externalId: string; title: string; metadata?: Record<string, any> }
  participants: any[]
  chat: any[]
  events: { at: string; type: string; identity: string; name: string; data: any }[]
  polls: any[]
  checks: any[]
  attendance: any
  recordings: { recording: any; playback?: { kind: 'embed' | 'file'; url: string } }[]
}

/* ------------------------------ Webhook ------------------------------ */

/** room.started / room.ended */
export interface HvmMeetRoomLifecycleData {
  roomId: string
  externalId: string
  sessionId: string
  startedAt?: string | null
  endedAt?: string | null
  peakParticipants?: number | null
}

export interface HvmMeetWebhookEnvelope<T = any> {
  id: string
  event: string
  createdAt: string
  app: string
  data: T
}

export type HvmMeetAttendanceStatus = 'present' | 'late' | 'absent'

export interface HvmMeetAttendanceReport {
  identity: string
  externalUserId?: string | null
  name: string
  roleKey: string
  status: HvmMeetAttendanceStatus
  computedStatus?: HvmMeetAttendanceStatus
  attendedSeconds: number
  expectedSeconds: number
  attendancePercent: number
  lateMinutes: number
  checksTotal: number
  checksPassed: number
  firstJoinedAt?: string | null
  lastLeftAt?: string | null
}

export interface HvmMeetAttendanceFinalizedData {
  roomId: string
  externalId: string
  sessionId: string
  windowStart?: string
  windowEnd?: string
  reports: HvmMeetAttendanceReport[]
}

export interface HvmMeetRecordingUrls {
  file?: string | null
  embed?: string | null
  watch?: string | null
  download?: string | null
  poster?: string | null
}

export interface HvmMeetRecordingReadyData {
  recordingId: string
  roomId: string
  externalId: string
  sessionId?: string | null
  mode?: string
  status?: string
  durationSeconds?: number | null
  sizeBytes?: number | null
  storage?: { assetId?: string | null; urls?: HvmMeetRecordingUrls | null } | null
}

/* ------------------------------ Phía academy ------------------------------ */

/** Cấu hình đã giải mã, chỉ dùng nội bộ. */
export interface HvmMeetConnectionConfig {
  base_url: string
  api_key: string
  webhook_secret?: string | null
  default_template_key: string
}

export interface LessonMeetingJoinResult {
  joinUrl: string
  expiresAt: string
  role: HvmMeetRole
  externalId: string
  lesson: {
    id: number
    title: string
    class_id: number
    class_name: string
  }
}

/**
 * Trả lời HVM Meet khi có người vào bằng link công khai + mã học viên
 * (POST webhooks/hvm-meet/verify-code). Hợp đồng: hvm-meet docs/INTEGRATION.md.
 */
export type HvmMeetCodeVerification =
  | { ok: true; identity: string; externalUserId: string; name: string; roleKey: string }
  | { ok: false; reason: 'NOT_FOUND' | 'INACTIVE' | 'NOT_ALLOWED' | 'NO_SECOND_FACTOR' | 'SECOND_FACTOR_MISMATCH' }
