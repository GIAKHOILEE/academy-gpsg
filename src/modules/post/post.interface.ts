import { AiStatus } from '@enums/ai-content.enum'

export interface IPost {
  id?: number
  title: string
  index: number
  description?: string
  content?: string
  slug: string
  image?: string
  is_active?: boolean
  is_banner?: boolean
  ai_status?: AiStatus | null
  ai_batch_id?: number | null
  ai_request_count?: number
  created_at?: Date
  updated_at?: Date
  post_catalog?: {
    id: number
    name: string
    slug: string
    ai_status?: AiStatus | null
  } | null
}
