import { IFile } from '@common/file'
import { IClasses } from '@modules/class/class.interface'
import { MeetingProvider } from '@enums/meeting.enum'
import { LessonMeetPolicy } from '@modules/hvm-meet/hvm-meet.policy'

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
  /** Ghi đè cách vào phòng / điểm danh HVM Meet của buổi này; null = theo cấu hình chung. */
  meet_policy?: LessonMeetPolicy | null
  class_id?: number
  class?: IClasses
  attendance_rule_id?: number
  attendance_rule?: any
  attendance_percent?: number
  video_progress?: {
    last_position?: number
    watched_seconds?: number
    is_completed?: boolean
    progress_percentage?: number
    attendance_percent?: number
    attendance_status?: number
  }
  // discussion?: IDiscuss[]
}
