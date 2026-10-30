import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'
import { AttendanceRule } from '@modules/class-rules/attendance-rule/attendance-rule.entity'
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

  @Column({ nullable: true })
  attendance_rule_id: number

  @ManyToOne(() => AttendanceRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'attendance_rule_id' })
  attendance_rule: AttendanceRule

  // Tỷ lệ % thời lượng xem video tối thiểu để tính điểm danh (mặc định 50%)
  @Column({ type: 'float', default: 50 })
  attendance_percent: number

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
