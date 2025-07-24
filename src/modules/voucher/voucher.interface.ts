import { VoucherType } from '@enums/voucher.enum'

export interface IVoucher {
  id: number
  code?: string
  type?: VoucherType
  discount?: number
}
