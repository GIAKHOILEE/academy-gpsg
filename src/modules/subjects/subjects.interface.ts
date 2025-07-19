import { IDepartment } from '@modules/departments/department.interface'

export interface ISubject {
  id: number
  code: string
  name: string
  image?: string
  credit?: number
  description?: string
  content?: string
  department_id?: number
  department?: IDepartment
}
