import { IClasses } from '@modules/class/class.interface'

export interface ILesson {
  id?: number
  index?: number
  title?: string
  schedule?: string
  start_time?: string
  end_time?: string
  description?: string
  video_url?: string[]
  slide_url?: string[]
  document_url?: string[]
  meeting_url?: string
  class_id?: number
  class?: IClasses
}
