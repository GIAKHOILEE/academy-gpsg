import { ITopic } from '../topic/topic.interface'

export interface IStory {
  id: number
  index: number
  title?: string
  thumbnail?: string
  content?: string
  topic_id?: number
  topic?: ITopic
  created_at: string
}
