export interface IDocuments {
  id?: number
  batch_code?: string
  name?: string
  index?: number
  quantity?: number
  quantity_original?: number
  import_price?: number
  sell_price?: number
  price_per_unit?: number
  image?: string
  description?: string
  day_import?: string
}

export interface IDocumentsOrder {
  id?: number
  series?: string
  price?: number
  profit?: number
  name?: string
  email?: string
  phone?: string
  address?: string
  note?: string
  created_at?: string
  document?: IDocuments
}
