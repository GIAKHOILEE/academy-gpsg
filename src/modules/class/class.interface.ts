import { ClassStatus, Schedule } from '@enums/class.enum'
import { ClassStudents } from './class-students/class-student.entity'
import { ISubject } from '@modules/subjects/subjects.interface'
import { ITeacher } from '@modules/teachers/teachers.interface'
import { IDepartment } from '@modules/departments/department.interface'
import { ISemester } from './_semester/semester.interface'
import { IScholastic } from './_scholastic/scholastic.interface'

export interface IClasses {
  id: number
  name?: string
  code?: string
  image?: string
  status?: ClassStatus
  number_lessons?: number
  number_periods?: number
  classroom?: string
  credit?: number
  max_students?: number
  price?: number
  current_students?: number
  schedule?: Schedule[]
  condition?: string
  end_enrollment_day: string
  start_time?: string
  end_time?: string
  opening_day?: string
  closing_day?: string
  is_active?: boolean
  scholastic?: IScholastic
  semester?: ISemester
  department?: IDepartment
  subject?: ISubject
  teacher?: ITeacher
  class_students?: ClassStudents[]
}
