import { IClassActivities } from '../class-activities/class-activities.interface'
import { Role } from '@enums/role.enum'

export interface IComment {
  id: number
  content: string
  user?: {
    id: number
    full_name: string
    saint_name: string
    avatar: string
  }
  role: Role
  class_activities?: IClassActivities
  created_at?: string
  updated_at?: string
}
