export interface IPostCatalog {
  id: number
  index?: number
  name: string
  slug: string
  parent?: IPostCatalog | null
  children?: IPostCatalog[]
  is_active?: boolean
}
