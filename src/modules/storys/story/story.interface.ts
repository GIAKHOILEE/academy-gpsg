import { AiStatus } from '@enums/ai-content.enum'
import { ITopic } from '../topic/topic.interface'

export interface IStory {
  id: number
  index: number
  title?: string
  thumbnail?: string
  content?: string
  topic_id?: number
  topic?: ITopic
  ai_status?: AiStatus | null
  ai_batch_id?: number | null
  created_at: string
}
