import { IUser } from '@modules/users/user.interface'

export interface IStudent extends IUser {
  card_code?: string
  image_4x6?: string
  diploma_image?: string
  transcript_image?: string
  other_document?: string
  graduate?: boolean
  graduate_year?: number
}
