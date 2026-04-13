import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { Lesson } from '../../lesson/lesson.entity'
import { HomeworkQuestion } from './question.entity'
import { HomeworkSubmission } from './submission.entity'

@Entity('homeworks')
export class Homeworks {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  title: string

  // lưu theo số giây
  @Column({ nullable: true })
  time_limit: number

  @Column({ nullable: true })
  description: string

  @Column({ nullable: true })
  deadline_date: string

  @Column({ nullable: true })
  deadline_time: string

  @Column({ nullable: true, default: 10 })
  total_points: number

  // @Column({ default: false })
  // is_active: boolean

  // bài cuối kì, mỗi class chỉ có 1 bài, nếu is_final = true điểm sẽ được cho vào điểm trong class_students luôn
  @Column({ default: false })
  is_final: boolean

  @OneToMany(() => HomeworkQuestion, q => q.homework, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  questions: HomeworkQuestion[]

  @OneToMany(() => HomeworkSubmission, s => s.homework, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  submissions: HomeworkSubmission[]

  @ManyToOne(() => Lesson, lesson => lesson.homeworks, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
