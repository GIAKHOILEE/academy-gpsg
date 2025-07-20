export interface IPost {
  id?: number
  index?: number
  description?: string
  content?: string
  slug: string
  image?: string
  is_active?: boolean
  is_banner?: boolean
  created_at?: Date
  updated_at?: Date
  post_catalog?: {
    id: number
    name: string
    slug: string
  } | null
}
