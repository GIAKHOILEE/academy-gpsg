import { IUser } from '@modules/users/user.interface'
import { IFile } from '@common/file'
import { StudentCardStatus } from '@enums/user.enum'

export interface IStudent extends IUser {
  card_code?: string
  image_4x6?: string
  card_status?: StudentCardStatus
  diploma_image?: IFile[]
  transcript_image?: IFile[]
  other_document?: IFile[]
  graduate?: boolean
  graduate_year?: number
}
