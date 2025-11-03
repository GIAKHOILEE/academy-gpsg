import { QuestionType } from '@enums/evaluation.enum'

export interface IQuestion {
  id?: number
  question: string
  options?: string[]
  type: QuestionType
}
