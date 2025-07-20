import { IWitnessFaith } from '../../witness-faiths/witness-faith.interface'

export interface IWitnessFaithMenu {
  id: number
  name?: string
  witness_faiths?: IWitnessFaith[]
}
