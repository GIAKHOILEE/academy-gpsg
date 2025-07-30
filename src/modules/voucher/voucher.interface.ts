import { VoucherType } from '@enums/voucher.enum'
import { IStudent } from '@modules/students/students.interface'

export interface IVoucher {
  id: number
  name?: string
  code?: string
  type?: VoucherType
  discount?: number
  student_id?: number
  enrollment_id?: number
  actual_discount?: number
  is_used?: boolean
  use_at?: string
  student?: IStudent
  full_name?: string
  saint_name?: string
}
