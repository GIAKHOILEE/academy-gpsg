export interface INavigation {
  id: number
  index: number
  slug: string
  title: string
  link: string
  is_active: boolean
  subNavigations?: ISubNavigation[]
}

export interface ISubNavigation {
  id: number
  index: number
  slug: string
  title: string
  link: string
  is_active: boolean
  navigationId?: number
}
