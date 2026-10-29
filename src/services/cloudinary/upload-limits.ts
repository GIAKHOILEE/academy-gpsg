import { Role } from '@enums/role.enum'

/**
 * Giới hạn chống lạm dụng cho các endpoint upload cũ (admin/upload*).
 *
 * Toàn bộ upload từ hvm-home đi qua đây, nên đây là chỗ duy nhất cần siết.
 * Mọi con số nằm ở một file để chỉnh một lần; code kiểm tra ở UploadGuardService.
 */

const MB = 1024 * 1024

/** Kích thước tối đa của một file theo vai trò (byte). */
export const MAX_FILE_SIZE_BY_ROLE: Record<number, number> = {
  [Role.STUDENT]: 25 * MB,
  [Role.TEACHER]: 25 * MB,
  [Role.SUPER_ADMIN]: 500 * MB,
  [Role.ADMIN]: 500 * MB,
  [Role.STAFF]: 500 * MB,
  [Role.FINANCE]: 500 * MB,
}

/** Vai trò không có trong bảng (token lạ) thì áp mức thấp nhất. */
export const MAX_FILE_SIZE_FALLBACK = 25 * MB

/** Trần tuyệt đối cho multer, bằng mức cao nhất trong bảng; kiểm tra theo vai trò làm sau. */
export const MULTER_MAX_FILE_SIZE = Math.max(...Object.values(MAX_FILE_SIZE_BY_ROLE), MAX_FILE_SIZE_FALLBACK)

/** Số file tối đa trong một lần gọi /multiple. */
export const MAX_FILES_PER_BATCH_ADMIN = 100
export const MAX_FILES_PER_BATCH_NON_ADMIN = 20

/** Giới hạn tần suất theo người dùng, cửa sổ trượt. */
export const RATE_LIMIT_UPLOADS = { max: 30, windowMs: 10 * 60 * 1000 }
export const RATE_LIMIT_BYTES = { max: 300 * MB, windowMs: 60 * 60 * 1000 }

/** Cùng người dùng gửi lại đúng nội dung này trong khoảng này thì trả URL cũ. */
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000

/** Những vai trò được coi là quản trị (không bị giới hạn số file/batch chặt). */
export const ADMIN_ROLES = new Set<number>([Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.FINANCE])

export function isAdminRole(role: Role | number | undefined): boolean {
  return ADMIN_ROLES.has(Number(role))
}

export function maxFileSizeFor(role: Role | number | undefined): number {
  return MAX_FILE_SIZE_BY_ROLE[Number(role)] ?? MAX_FILE_SIZE_FALLBACK
}

export function maxFilesPerBatchFor(role: Role | number | undefined): number {
  return isAdminRole(role) ? MAX_FILES_PER_BATCH_ADMIN : MAX_FILES_PER_BATCH_NON_ADMIN
}

export function formatMb(bytes: number): string {
  const mb = bytes / MB
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
}
