import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Homeworks } from './homeworks.entity'
import { Student } from '@modules/students/students.entity'
import { User } from '@modules/users/user.entity'
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

  // Trạng thái đã tải xuống bài nộp hay chưa
  @Column({ name: 'is_download', type: 'boolean', default: false })
  is_download: boolean

  // Nhận xét chung cho toàn bộ bài nộp
  @Column({ type: 'text', nullable: true })
  feedback: string

  // Đính kèm (ảnh, file, link) cho feedback toàn bài
  @Column({ type: 'json', nullable: true })
  feedback_attachments: any

  // ai chấm (user id) nếu chấm tay
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'graded_by' })
  graded_by: User

  @Column({ nullable: true })
  graded_at: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
