import { AiStatus } from '@enums/ai-content.enum'

export interface ITopic {
  id: number
  name?: string
  description?: string
  ai_status?: AiStatus | null
}
