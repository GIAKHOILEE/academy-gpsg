import { IFile } from '@common/file'
import { IClasses } from '@modules/class/class.interface'

export interface ILesson {
  id?: number
  index?: number
  title?: string
  schedule?: string
  start_date?: string
  start_time?: string
  end_time?: string
  description?: string
  video_url?: string[]
  slide_url?: IFile[]
  document_url?: IFile[]
  meeting_url?: string
  class_id?: number
  class?: IClasses
  attendance_rule_id?: number
  attendance_rule?: any
  video_progress?: {
    last_position?: number
    watched_seconds?: number
    is_completed?: boolean
    progress_percentage?: number
    attendance_status?: number
  }
  // discussion?: IDiscuss[]
}
