import { IUser } from '@modules/users/user.interface'

export interface ITeacher extends IUser {
  other_name?: string
  degree?: string
  specialized?: string
  professional_certificate?: string
  teacher_certificate?: string
  other_certificate?: string[]
  subject_teaching?: string[]
  boarding?: boolean
  start_date?: string
  cv?: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  bank_branch?: string
}
