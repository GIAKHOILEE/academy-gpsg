import { AttendanceStatus } from '@enums/class.enum'
import { IClassStudent } from '@modules/class/class-students/class-student.interface'

export interface IAttendance {
  id: number
  attendance_date?: string
  status?: AttendanceStatus
  note?: string
  class_student_id?: number
  class_student?: IClassStudent
}
