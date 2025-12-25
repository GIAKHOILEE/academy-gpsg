import { ILesson } from '@modules/_online-feature/lesson/lesson.interface'
import { IClasses } from '../class.interface'

export interface IClassNotification {
  id: number
  index?: number
  is_active?: boolean
  is_online?: boolean
  title?: string
  thumbnail?: string
  description?: string
  content?: string
  urgent?: boolean
  lesson_id?: number | null
  lesson?: ILesson | null
  created_at?: string
  class_id?: number
  class?: IClasses
}
