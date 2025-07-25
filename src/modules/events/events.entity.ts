import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'boolean', default: true })
  is_active: boolean

  @Column({ type: 'boolean', default: false })
  is_banner: boolean

  @Column()
  title: string

  @Column()
  thumbnail: string

  @Column({ nullable: true })
  description: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column()
  start_date: string

  @Column({ nullable: true })
  end_date: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
