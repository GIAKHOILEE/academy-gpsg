import { IFile } from '@common/file'
import { IClasses } from '@modules/class/class.interface'
import { MeetingProvider } from '@enums/meeting.enum'

export interface IVideoProgress {
  id?: number
  video_key?: string
  video_url?: string | null
  last_position?: number
  watched_seconds?: number
  total_duration?: number
  is_completed?: boolean
  progress_percentage?: number
  attendance_percent?: number
  attendance_status?: number
}

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
  meeting_provider?: MeetingProvider
  class_id?: number
  class?: IClasses
  attendance_rule_id?: number
  attendance_rule?: any
  attendance_percent?: number
  video_progress?: IVideoProgress[] | IVideoProgress | null
  // discussion?: IDiscuss[]
}
