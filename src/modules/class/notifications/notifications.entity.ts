import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'

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

  @ManyToOne(() => Classes, classes => classes.notifications, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ nullable: true })
  class_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
