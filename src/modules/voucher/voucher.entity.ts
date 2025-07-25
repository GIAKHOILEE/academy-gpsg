import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { VoucherType } from 'src/enums/voucher.enum'

@Entity()
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  name: string

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

  @Column({ nullable: true })
  student_id: number

  @Column({ nullable: true })
  enrollment_id: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_discount: number

  @Column({ type: 'boolean', default: false })
  is_used: boolean

  @Column({ nullable: true })
  use_at: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
