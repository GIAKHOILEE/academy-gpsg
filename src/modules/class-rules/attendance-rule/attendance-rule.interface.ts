import { AttendanceRuleType } from '@enums/class.enum'
import { IClasses } from '@modules/class/class.interface'

export interface IAttendanceRule {
  id: number
  type?: AttendanceRuleType // attendance_percentage, teacher_evaluation, score_based
  lesson_date?: string
  card_start_time?: string
  card_end_time?: string
  delay: number
  class_id?: number
  class?: IClasses
}
