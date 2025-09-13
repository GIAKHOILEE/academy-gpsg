import { RuleType } from '@enums/class.enum'
import { IClasses } from '@modules/class/class.interface'

export interface IClassRule {
  id: number
  type?: RuleType
  attendance_percent?: number
  score?: number
  description?: string
  class_id?: number
  class?: IClasses
}
