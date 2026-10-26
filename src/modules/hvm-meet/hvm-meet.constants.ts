/**
 * Hằng số dùng chung của tích hợp phòng học HVM Meet.
 *
 * Quy ước định danh (thống nhất với HVM Meet, không đổi tuỳ tiện vì báo cáo điểm danh
 * và bản ghi hình trả về dựa đúng trên các chuỗi này):
 * - Phòng của một buổi học:  externalId = "lesson-<lessonId>"
 * - Người dùng academy:      identity   = "academy:user:<userId>", externalUserId = "<userId>"
 */

/** Biến môi trường, CHỈ dùng để khởi tạo cấu hình lần đầu (seeder). Sau đó sửa trên trang quản trị. */
export const HVM_MEET_URL_ENV = 'HVM_MEET_URL'
export const HVM_MEET_API_KEY_ENV = 'HVM_MEET_API_KEY'
export const HVM_MEET_WEBHOOK_SECRET_ENV = 'HVM_MEET_WEBHOOK_SECRET'

/** Mẫu phòng mặc định bên HVM Meet cho buổi học. */
export const HVM_MEET_DEFAULT_TEMPLATE_KEY = 'class'

/** Đường nhận webhook từ HVM Meet. main.ts gắn raw body parser riêng cho đúng đường này. */
export const HVM_MEET_WEBHOOK_PATH = '/webhooks/hvm-meet'

/** Lệch giờ tối đa giữa `t` trong chữ ký webhook và giờ máy chủ (giây). */
export const HVM_MEET_SIGNATURE_TOLERANCE_SECONDS = 300

/** Thời gian chờ tối đa cho một lần gọi API HVM Meet. */
export const HVM_MEET_REQUEST_TIMEOUT_MS = 10_000

/** Ghi chú điểm danh do HVM Meet ghi luôn bắt đầu bằng chuỗi này; ghi chú khác = điểm danh tay, không ghi đè. */
export const HVM_MEET_ATTENDANCE_NOTE_PREFIX = 'HVM Meet:'

/** Múi giờ của lịch học (start_date/start_time/end_time lưu dạng chuỗi giờ Việt Nam). */
export const LESSON_TIMEZONE_OFFSET_MINUTES = 7 * 60

/** Bỏ qua PUT phòng nếu nội dung không đổi và vừa đồng bộ trong khoảng này. */
export const HVM_MEET_ROOM_SYNC_TTL_MS = 10 * 60 * 1000

export const lessonExternalId = (lessonId: number | string): string => `lesson-${lessonId}`

/** "lesson-12" → 12; chuỗi khác → null. */
export const parseLessonExternalId = (externalId: string | null | undefined): number | null => {
  const match = /^lesson-(\d+)$/.exec(String(externalId ?? '').trim())
  if (!match) return null
  const id = Number(match[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export const academyIdentity = (userId: number | string): string => `academy:user:${userId}`
