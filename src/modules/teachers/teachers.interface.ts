import { IFile } from '@common/file'
import { IUser } from '@modules/users/user.interface'

export interface ITeacher extends IUser {
  other_name?: string
  degree?: string
  specialized?: string
  professional_certificate?: IFile[]
  teacher_certificate?: IFile[]
  other_certificate?: string[]
  subject_teaching?: string[]
  boarding?: boolean
  start_date?: string
  cv?: IFile[]
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  bank_branch?: string
}
