import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('calendars')
export class Calendars {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'text', nullable: true })
  image: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column()
  day: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
