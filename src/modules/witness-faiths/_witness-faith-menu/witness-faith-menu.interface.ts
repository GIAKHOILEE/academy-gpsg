import { AiStatus } from '@enums/ai-content.enum'
import { IWitnessFaith } from '../../witness-faiths/witness-faith.interface'

export interface IWitnessFaithMenu {
  id: number
  name?: string
  ai_status?: AiStatus | null
  witness_faiths?: IWitnessFaith[]
}
