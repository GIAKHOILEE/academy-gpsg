import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'

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

  // đánh dấu là thông báo khẩn, thông báo khẩn sẽ gắn vào buổi học của class có học online
  @Column({ type: 'boolean', default: false })
  urgent: boolean

  @Column({ type: 'json', nullable: true })
  user_read_ids: number[]

  @Column({ nullable: true })
  lesson_id: number

  @ManyToOne(() => Lesson, lesson => lesson.class_notifications, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

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
