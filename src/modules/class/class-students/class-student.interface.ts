import { IStudent } from '@modules/students/students.interface'
import { IClasses } from '../class.interface'

export interface IClassStudent {
  id: number
  score?: string
  class?: IClasses
  student?: IStudent
}
