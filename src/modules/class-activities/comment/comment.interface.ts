import { IClassActivities } from '../class-activities/class-activities.interface'

export interface IComment {
  id: number
  content: string
  student?: {
    id: number
    full_name: string
    saint_name: string
    avatar: string
  }
  class_activities?: IClassActivities
  created_at?: string
  updated_at?: string
}
