export interface INavigationAttendance {
  id: number
  index: number
  slug: string
  title: string
  content?: string
  link: string
  is_active: boolean
  subNavigations?: ISubNavigationAttendance[]
}

export interface ISubNavigationAttendance {
  id: number
  index: number
  slug: string
  title: string
  content?: string
  link: string
  is_active: boolean
  navigationId?: number
}
