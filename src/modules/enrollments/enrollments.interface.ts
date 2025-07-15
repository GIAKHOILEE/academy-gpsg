import { PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { IClasses } from '@modules/class/class.interface'

export interface IEnrollments {
  id: number
  code?: string
  registration_date?: Date
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  status?: StatusEnrollment
  total_fee?: number
  prepaid?: number
  debt?: number
  note?: string
  user_note?: string
  is_logged?: boolean
  classes?: IClasses[]
  // thông tin sinh viên
  // student?: IStudent
  student_id?: number
  student_code?: string
  saint_name?: string
  full_name?: string
  email?: string
  phone_number?: string
  birth_date?: string
  address?: string
  birth_place?: string
  parish?: string
  deanery?: string
  diocese?: string
  congregation?: string
}
