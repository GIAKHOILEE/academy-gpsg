import { IWitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.interface'

export interface IWitnessFaith {
  id: number
  name?: string
  image?: string
  description?: string
  content?: string
  witness_faith_menu_id?: number
  witness_faith_menu?: IWitnessFaithMenu
}
