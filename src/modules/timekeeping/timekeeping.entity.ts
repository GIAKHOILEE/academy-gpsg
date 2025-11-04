import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class Timekeeping {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  year: number

  @Column()
  month: number

  @Column({ type: 'json', nullable: true })
  days: number[]

  // Phụ cấp
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  allowance: number

  // Lương/giờ
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salary_per_hour: number

  @Column({ nullable: true })
  note: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
