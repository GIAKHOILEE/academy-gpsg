import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('class_notifications')
export class ClassNotification {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'boolean', default: true })
  is_active: boolean

  @Column({ type: 'boolean', default: true })
  is_online: boolean

  @Column()
  title: string

  @Column()
  thumbnail: string

  @Column({ nullable: true })
  description: string

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
