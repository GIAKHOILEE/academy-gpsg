import { PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { IClasses } from '../class.interface'
import { IStudent } from '@modules/students/students.interface'

export interface IClassStudent {
  id: number
  code: string
  registration_date: Date
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  status: StatusEnrollment
  total_fee: number
  prepaid: number
  debt: number
  note: string
  is_logged: boolean
  score: number
  class?: IClasses
  student?: IStudent
}
