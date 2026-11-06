import { AiStatus } from '@enums/ai-content.enum'

export interface IPostCatalog {
  id: number
  index?: number
  name: string
  slug: string
  image?: string
  icon?: string
  parent?: IPostCatalog | null
  children?: IPostCatalog[]
  is_active?: boolean
  ai_status?: AiStatus | null
}
