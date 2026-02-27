import { QuestionTypeHomework, SubmissionStatus } from '@enums/homework.enum'
import { ILesson } from '../lesson/lesson.interface'
import { IStudent } from '@modules/students/students.interface'
import { ITeacher } from '@modules/teachers/teachers.interface'

export interface IHomework {
  id?: number
  title?: string
  description?: string
  deadline_date?: string
  deadline_time?: string
  total_points?: number
  is_active?: boolean
  questions?: IHomeworkQuestion[]
  submissions?: IHomeworkSubmission[]
  lesson_id?: number
  lesson?: ILesson
}

export interface IHomeworkQuestion {
  id?: number
  content?: string
  type?: QuestionTypeHomework // MCQ_SINGLE, MCQ_MULTI, ESSAY, FILE
  points?: number
  options?: IHomeworkOption[]
  homework_id?: number
  homework?: IHomework
}

export interface IHomeworkOption {
  id?: number
  content?: string
  is_correct?: boolean // nếu MCQ_SINGLE, chỉ có 1 option đúng
}

export interface IHomeworkSubmission {
  id?: number
  answers?: IHomeworkAnswer[]
  score?: number
  status?: SubmissionStatus
  homework_id?: number
  homework?: IHomework
  student_id?: number
  student?: IStudent
  graded_by?: ITeacher
  graded_at?: string
}

export interface IHomeworkAnswer {
  id?: number
  answer_text?: string // tự luận
  file?: string // file
  selected_option_ids?: number[]
  score?: number
  feedback?: string
  question_id?: number
  question?: IHomeworkQuestion
  submission_id?: number
  submission?: IHomeworkSubmission
}
