import { AiStatus } from '@enums/ai-content.enum'
import { IWitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.interface'

export interface IWitnessFaith {
  id: number
  name?: string
  image?: string
  description?: string
  content?: string
  witness_faith_menu_id?: number
  witness_faith_menu?: IWitnessFaithMenu
  ai_status?: AiStatus | null
  ai_batch_id?: number | null
  ai_request_count?: number
  created_at?: Date | string
}
