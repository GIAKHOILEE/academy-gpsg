import { formatStringToDate, trimString } from '@common/utils'
import { LearnType } from '@enums/class.enum'
import { EntityManager, QueryRunner } from 'typeorm'
import { EnrollmentLogChanges, EnrollmentLogClassSnapshot, EnrollmentLogSnapshot } from './enrollment-logs.entity'
import { Enrollments } from './enrollments.entity'

export const ENROLLMENT_AUDIT_HANDLED_KEY = '__enrollmentAuditHandled'

/**
 * Đánh dấu transaction/queryRunner hiện tại đã ghi audit log tường minh ở tầng service,
 * để `EnrollmentAuditSubscriber` (lưới an toàn fallback) không ghi trùng bản ghi thứ 2.
 */
export function markEnrollmentAuditHandled(manager?: EntityManager | null): void {
  const queryRunner = manager?.queryRunner
  if (!queryRunner) return
  if (!queryRunner.data || typeof queryRunner.data !== 'object') {
    queryRunner.data = {}
  }
  queryRunner.data[ENROLLMENT_AUDIT_HANDLED_KEY] = true
}

export function isEnrollmentAuditHandled(queryRunner?: QueryRunner | null): boolean {
  return Boolean(queryRunner?.data?.[ENROLLMENT_AUDIT_HANDLED_KEY])
}

export interface EnrollmentClassMeta {
  id: number
  code?: string | null
  name?: string | null
  price?: number | null
}

export interface EnrollmentDiffSource extends Partial<Enrollments> {
  student_code?: string | null
}

const NUMERIC_FIELDS = new Set(['discount', 'total_fee', 'prepaid', 'debt'])
const INTEGER_FIELDS = new Set(['payment_method', 'payment_status', 'status', 'gender', 'student_id'])
const BOOLEAN_FIELDS = new Set(['is_read_note', 'is_logged'])
const DATE_ONLY_FIELDS = new Set(['birth_date'])
const STRING_FIELDS = new Set([
  'voucher_code',
  'note',
  'user_note',
  'saint_name',
  'full_name',
  'email',
  'phone_number',
  'address',
  'shipping_name',
  'shipping_phone',
  'shipping_address',
  'shipping_note',
  'birth_place',
  'parish',
  'deanery',
  'diocese',
  'congregation',
  'student_code',
])

export const TRACKED_ENROLLMENT_FIELDS: string[] = [
  'status',
  'payment_status',
  'payment_method',
  'voucher_code',
  'discount',
  'total_fee',
  'prepaid',
  'debt',
  'class_ids',
  'student_id',
  'student_code',
  'note',
  'user_note',
  'is_read_note',
  'saint_name',
  'full_name',
  'gender',
  'email',
  'phone_number',
  'birth_date',
  'address',
  'shipping_name',
  'shipping_phone',
  'shipping_address',
  'shipping_note',
  'birth_place',
  'parish',
  'deanery',
  'diocese',
  'congregation',
]

export function normalizeNumberValue(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

export function normalizeStringValue(value: any): string | null {
  if (value === undefined || value === null) return null
  const str = typeof value === 'string' ? trimString(value) : String(value).trim()
  return str === '' ? null : str
}

export function normalizeBooleanValue(value: any): boolean | null {
  if (value === undefined || value === null) return null
  return Boolean(value)
}

export function normalizeDateOnlyValue(value: any): string | null {
  if (value === undefined || value === null || value === '') return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss...
    const isoDatePrefix = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
    if (isoDatePrefix) {
      return `${isoDatePrefix[1]}-${isoDatePrefix[2]}-${isoDatePrefix[3]}`
    }

    const parsed = formatStringToDate(trimmed)
    if (parsed && !Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    return trimmed
  }

  return null
}

export function normalizeTimestampValue(value: any): string | null {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

export function normalizeClassItems(
  classIds: { class_id: number; learn_type: LearnType }[] | null | undefined,
): { class_id: number; learn_type: number }[] {
  if (!Array.isArray(classIds)) return []

  const deduped = new Map<number, number>()
  for (const item of classIds) {
    const classId = Number(item?.class_id)
    if (!Number.isInteger(classId) || classId <= 0) continue
    deduped.set(classId, Number(item?.learn_type ?? LearnType.OFFLINE))
  }

  return [...deduped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([class_id, learn_type]) => ({ class_id, learn_type }))
}

export function enrichClassItems(
  classIds: { class_id: number; learn_type: LearnType | number }[] | null | undefined,
  classMap?: Map<number, EnrollmentClassMeta>,
): EnrollmentLogClassSnapshot[] {
  const normalized = normalizeClassItems(classIds as any)
  return normalized.map(item => {
    const meta = classMap?.get(item.class_id)
    return {
      class_id: item.class_id,
      class_code: meta?.code ?? null,
      class_name: meta?.name ?? null,
      price: meta?.price !== undefined && meta?.price !== null ? Number(meta.price) : null,
      learn_type: item.learn_type,
    }
  })
}

export function extractUniqueClassIds(
  ...lists: ({ class_id: number; learn_type?: LearnType | number }[] | null | undefined)[]
): number[] {
  const ids = new Set<number>()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const id = Number(item?.class_id)
      if (Number.isInteger(id) && id > 0) ids.add(id)
    }
  }
  return [...ids]
}

function normalizeField(field: string, value: any): any {
  if (NUMERIC_FIELDS.has(field)) return normalizeNumberValue(value) ?? 0
  if (INTEGER_FIELDS.has(field)) return normalizeNumberValue(value)
  if (BOOLEAN_FIELDS.has(field)) return normalizeBooleanValue(value)
  if (DATE_ONLY_FIELDS.has(field)) return normalizeDateOnlyValue(value)
  if (STRING_FIELDS.has(field)) return normalizeStringValue(value)
  return value ?? null
}

/**
 * So sánh 2 trạng thái đơn đăng ký và chỉ trả về các trường thực sự thay đổi.
 * Đã xử lý các khác biệt kiểu dữ liệu MySQL/TypeORM (decimal string vs number, Date vs string,
 * null vs empty string, thứ tự phần tử trong mảng class_ids).
 */
export function diffEnrollment(
  before: EnrollmentDiffSource,
  after: EnrollmentDiffSource,
  classMap?: Map<number, EnrollmentClassMeta>,
  fields: string[] = TRACKED_ENROLLMENT_FIELDS,
): EnrollmentLogChanges {
  const changes: EnrollmentLogChanges = {}

  for (const field of fields) {
    if (field === 'class_ids') {
      const oldNorm = normalizeClassItems(before.class_ids)
      const newNorm = normalizeClassItems(after.class_ids)
      const isEqual =
        oldNorm.length === newNorm.length &&
        oldNorm.every((item, idx) => item.class_id === newNorm[idx].class_id && item.learn_type === newNorm[idx].learn_type)

      if (!isEqual) {
        changes.class_ids = {
          old: enrichClassItems(oldNorm, classMap),
          new: enrichClassItems(newNorm, classMap),
        }
      }
      continue
    }

    const oldVal = normalizeField(field, (before as any)[field])
    const newVal = normalizeField(field, (after as any)[field])

    if (oldVal !== newVal) {
      changes[field] = { old: oldVal, new: newVal }
    }
  }

  return changes
}

export function buildEnrollmentSnapshot(
  enrollment: Partial<Enrollments>,
  studentCode?: string | null,
  classMap?: Map<number, EnrollmentClassMeta>,
): EnrollmentLogSnapshot {
  return {
    id: Number(enrollment.id),
    code: normalizeStringValue(enrollment.code),
    registration_date: normalizeTimestampValue(enrollment.registration_date),
    payment_method: normalizeNumberValue(enrollment.payment_method),
    payment_status: normalizeNumberValue(enrollment.payment_status),
    status: normalizeNumberValue(enrollment.status),
    voucher_code: normalizeStringValue(enrollment.voucher_code),
    discount: normalizeNumberValue(enrollment.discount) ?? 0,
    class_ids: enrichClassItems(enrollment.class_ids, classMap),
    total_fee: normalizeNumberValue(enrollment.total_fee) ?? 0,
    prepaid: normalizeNumberValue(enrollment.prepaid) ?? 0,
    debt: normalizeNumberValue(enrollment.debt) ?? 0,
    note: normalizeStringValue(enrollment.note),
    user_note: normalizeStringValue(enrollment.user_note),
    is_read_note: normalizeBooleanValue(enrollment.is_read_note),
    is_logged: Boolean(enrollment.is_logged),
    saint_name: normalizeStringValue(enrollment.saint_name),
    gender: normalizeNumberValue(enrollment.gender),
    full_name: normalizeStringValue(enrollment.full_name),
    email: normalizeStringValue(enrollment.email),
    phone_number: normalizeStringValue(enrollment.phone_number),
    birth_date: normalizeDateOnlyValue(enrollment.birth_date),
    address: normalizeStringValue(enrollment.address),
    shipping_name: normalizeStringValue(enrollment.shipping_name),
    shipping_phone: normalizeStringValue(enrollment.shipping_phone),
    shipping_address: normalizeStringValue(enrollment.shipping_address),
    shipping_note: normalizeStringValue(enrollment.shipping_note),
    birth_place: normalizeStringValue(enrollment.birth_place),
    parish: normalizeStringValue(enrollment.parish),
    deanery: normalizeStringValue(enrollment.deanery),
    diocese: normalizeStringValue(enrollment.diocese),
    congregation: normalizeStringValue(enrollment.congregation),
    student_id: normalizeNumberValue(enrollment.student_id),
    student_code: normalizeStringValue(studentCode ?? enrollment.student?.user?.code),
    created_at: normalizeTimestampValue(enrollment.created_at),
    updated_at: normalizeTimestampValue(enrollment.updated_at),
    deleted_at: normalizeTimestampValue(enrollment.deleted_at),
  }
}
