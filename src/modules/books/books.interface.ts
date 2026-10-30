import { BookDeliveryStatus, ClassStatus } from '@enums/class.enum'
import { Gender } from '@enums/role.enum'

export interface IBookClassSummary {
  id: number
  code?: string
  name?: string
  status?: ClassStatus
  is_online?: boolean
  learn_offline?: boolean
  learn_video?: boolean
  learn_meeting?: boolean
  opening_day?: string
  closing_day?: string
}

export interface IBook {
  id: number
  code?: string
  name: string
  author?: string
  publisher?: string
  publication_year?: number
  image?: string
  description?: string
  classes?: IBookClassSummary[]
  created_at?: Date
  updated_at?: Date
}

export interface IStudentBook {
  id: number
  student_id: number
  book_id: number
  book_status: BookDeliveryStatus
  shipping_address?: string
  book_delivery_note?: string
  book_received_date?: string
  created_at?: Date
  updated_at?: Date
  student?: {
    id: number
    code?: string
    full_name?: string
    first_name?: string
    saint_name?: string
    email?: string
    phone_number?: string
    gender?: Gender
    avatar?: string
  }
  book?: {
    id: number
    code?: string
    name: string
    author?: string
    publisher?: string
    publication_year?: number
    image?: string
    description?: string
  }
}
