import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column()
  thumbnail: string

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
