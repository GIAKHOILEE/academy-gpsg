import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'

export interface IFinances {
  id: number
  name: string
  type: FinancesType
  amount_received: number
  amount_spent: number
  total_amount: number
  statement: boolean
  payment_method: FinancesPaymentMethod
  day: string
  created_at: string
  updated_at: string
}
