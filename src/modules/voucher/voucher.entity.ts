import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { VoucherType } from 'src/enums/voucher.enum'

@Entity()
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  code: string

  @Column({
    type: 'enum',
    enum: VoucherType,
    default: VoucherType.PERCENTAGE,
  })
  type: VoucherType

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
