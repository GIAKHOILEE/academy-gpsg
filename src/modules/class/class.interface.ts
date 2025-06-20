import { ClassStatus, Schedule, Semester } from '@enums/class.enum'
import { ClassStudents } from './class-students/class-students.entity'
import { ISubject } from '@modules/subjects/subjects.interface'
import { ITeacher } from '@modules/teachers/teachers.interface'
import { IDepartment } from '@modules/departments/department.interface'

export interface IClasses {
  id: number
  name?: string
  code?: string
  status?: ClassStatus
  classroom?: string
  scholastic?: string
  semester?: Semester
  schedule?: Schedule[]
  start_time?: string
  end_time?: string
  opening_day?: string
  closing_day?: string
  is_active?: boolean
  subject?: ISubject
  teacher?: ITeacher
  department?: IDepartment
  class_students?: ClassStudents[]
}
