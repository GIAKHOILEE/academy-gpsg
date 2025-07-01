import { IStudent } from '@modules/students/students.interface'
import { IClasses } from '../class.interface'

export interface IClassStudent {
  id: number
  score?: number
  class?: IClasses
  student?: IStudent
  // thông tin sinh viên
  // student_id?: number
  // student_code?: string
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
