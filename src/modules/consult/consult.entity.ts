import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('consult')
export class Consult {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  saint_name: string

  @Column({ nullable: true })
  full_name: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  phone_number: string

  @Column({ nullable: true, type: 'text' })
  content: string

  @Column({ nullable: true, default: false })
  is_read: boolean

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
