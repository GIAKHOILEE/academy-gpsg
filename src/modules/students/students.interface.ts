import { IUser } from '@modules/users/user.interface'
import { IFile } from '@common/file'

export interface IStudent extends IUser {
  card_code?: string
  image_4x6?: string
  diploma_image?: IFile[]
  transcript_image?: IFile[]
  other_document?: IFile[]
  graduate?: boolean
  graduate_year?: number
}
