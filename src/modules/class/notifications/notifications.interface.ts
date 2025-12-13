import { IClasses } from '../class.interface'

export interface IClassNotification {
  id: number
  index?: number
  is_active?: boolean
  is_online?: boolean
  title?: string
  thumbnail?: string
  description?: string
  content?: string
  created_at?: string
  class_id?: number
  class?: IClasses
}
