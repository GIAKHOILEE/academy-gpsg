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

  @Column({ nullable: true })
  description: string

  @Column({ nullable: true })
  deadline_date: string

  @Column({ nullable: true })
  deadline_time: string

  @Column({ nullable: true })
  total_points: number

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
