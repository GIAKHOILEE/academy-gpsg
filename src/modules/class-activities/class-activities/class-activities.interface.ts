import { IComment } from '../comment/comment.interface'

export interface IClassActivities {
  id: number
  title?: string
  description?: string
  content?: string
  class_id?: number
  teacher_id?: number
  teacher?: {
    id: number
    saint_name: string
    full_name: string
    avatar: string
  }
  comments?: IComment[]
  created_at?: string
  updated_at?: string
}
