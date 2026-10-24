export interface IBook {
  id: number
  code?: string
  name: string
  author?: string
  publisher?: string
  publication_year?: number
  image?: string
  description?: string
  created_at?: Date
  updated_at?: Date
}
