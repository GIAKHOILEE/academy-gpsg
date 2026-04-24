import { IStudent } from '../students/students.interface'

export interface ICertificates {
  id: number
  code: string
  image_url: string
  student_id: number
  student?: IStudent
}
