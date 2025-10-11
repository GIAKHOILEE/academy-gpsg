import { IUser } from '@modules/users/user.interface'

export interface IMailboxes {
  id?: number
  title?: string
  content?: string
  is_read?: boolean
  created_at?: string
  user_id?: number
  user?: IUser
}
