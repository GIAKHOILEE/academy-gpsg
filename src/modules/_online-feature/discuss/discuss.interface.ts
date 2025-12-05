import { IUser } from '@modules/users/user.interface'
import { ILesson } from '../lesson/lesson.interface'

export interface IDiscuss {
  id: number
  number_comment?: number
  parent_id?: number
  content?: string
  user?: IUser
  lesson?: ILesson
  created_at?: string
}
