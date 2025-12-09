import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Homeworks } from './homeworks.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { SubmissionStatus } from 'src/enums/homework.enum'
import { HomeworkAnswer } from './answer.entity'

@Entity('homework_submissions')
export class HomeworkSubmission {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Homeworks, h => h.submissions, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'homework_id' })
  homework: Homeworks

  @ManyToOne(() => Student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @OneToMany(() => HomeworkAnswer, a => a.submission, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  answers: HomeworkAnswer[]

  @Column({ type: 'float', default: 0 })
  score: number

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING })
  status: SubmissionStatus

  // ai chấm (teacher id) nếu chấm tay
  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'graded_by' })
  graded_by: Teacher

  @Column({ nullable: true })
  graded_at: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
