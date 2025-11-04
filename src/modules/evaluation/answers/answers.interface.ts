export interface IAnswers {
  id: number
  class_id?: number
  semester_id?: number
  scholastic_id?: number
  student_id?: number
  student?: {
    id?: number
    full_name?: string
    saint_name?: string
    code?: string
  }
  question_id?: number
  question?: {
    id?: number
    question?: string
  }
  answer_text?: string
  answer_number?: number
  answer_single_choice?: number
  answer_multiple_choice?: number[]
}
