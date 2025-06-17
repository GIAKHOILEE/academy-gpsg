import { ITopic } from '../topic/topic.interface'

export interface IStory {
  id: number
  title?: string
  image?: string
  content?: string
  topic_id?: number
  topic?: ITopic
  created_at: string
}
