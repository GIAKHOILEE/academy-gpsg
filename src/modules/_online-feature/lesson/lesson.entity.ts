import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'
import { Discuss } from '../discuss/discuss.entity'
import { Homeworks } from '../homeworks/entities/homeworks.entity'
import { ClassNotification } from '@modules/class/notifications/notifications.entity'
import { IFile } from '@common/file'

@Entity('lesson')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column()
  title: string

  @Column({ nullable: true })
  schedule: string

  @Column({ nullable: true })
  start_date: string

  @Column({ nullable: true })
  start_time: string
  @Column({ nullable: true })
  end_time: string

  @Column()
  description: string

  @Column({ nullable: true, type: 'json' })
  video_url: string[]

  @Column({ nullable: true, type: 'json' })
  slide_url: IFile[]

  @Column({ nullable: true, type: 'json' })
  document_url: IFile[]

  @Column({ nullable: true })
  meeting_url: string

  @ManyToOne(() => Classes, classes => classes.lessons, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @OneToMany(() => Discuss, discusses => discusses.lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  discusses: Discuss[]

  @OneToMany(() => Homeworks, homeworks => homeworks.lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  homeworks: Homeworks[]

  @OneToMany(() => ClassNotification, notifications => notifications.lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  class_notifications: ClassNotification[]

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date
}
