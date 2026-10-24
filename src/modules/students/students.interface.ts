import { IUser } from '@modules/users/user.interface'
import { IFile } from '@common/file'
import { StudentCardStatus } from '@enums/user.enum'
import { BookDeliveryStatus, LearnType } from '@enums/class.enum'

export interface IStudent extends IUser {
  class_student_id?: number
  learn_type?: LearnType
  book_status?: BookDeliveryStatus
  book_delivery_note?: string
  book_received_date?: string
  card_code?: string
  image_4x6?: string
  card_status?: StudentCardStatus
  note?: string
  diploma_image?: IFile[]
  transcript_image?: IFile[]
  other_document?: IFile[]
  graduate?: boolean
  graduate_year?: number
}
