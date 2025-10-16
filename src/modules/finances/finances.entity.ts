import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('finances')
export class FinancesEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  type: FinancesType

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount_received: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount_spent: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number

  //sao kê
  @Column()
  statement: boolean

  @Column()
  payment_method: FinancesPaymentMethod

  @Column()
  day: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
