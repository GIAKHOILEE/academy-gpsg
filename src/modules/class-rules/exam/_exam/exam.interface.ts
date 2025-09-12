import { IClasses } from '@modules/class/class.interface'
// import { IExamScore } from '../exam-scores/exam-scores.interface'

export interface IExam {
  id: number
  name?: string
  weight_percentage?: number
  class_id?: number
  class?: IClasses
  //   scores?: IExamScore[]
}
