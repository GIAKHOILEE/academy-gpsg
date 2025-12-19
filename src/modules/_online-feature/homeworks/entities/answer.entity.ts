import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm'
import { HomeworkQuestion } from './question.entity'
import { HomeworkSubmission } from './submission.entity'

@Entity('homework_answers')
export class HomeworkAnswer {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => HomeworkSubmission, s => s.answers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: HomeworkSubmission

  @ManyToOne(() => HomeworkQuestion, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: HomeworkQuestion

  // nếu MCQ: lưu option id(s) đã chọn (một option hoặc mảng)
  @Column({ type: 'json', nullable: true })
  selected_option_ids: number[] // null nếu essay

  // nếu essay: lưu text
  @Column({ type: 'text', nullable: true })
  answer_text: string

  // nếu FILE: lưu file
  @Column({ type: 'text', nullable: true })
  file: string

  // điểm cho câu này (do auto hoặc teacher chấm)
  @Column({ type: 'float', default: 0 })
  score: number

  // optional: ghi chú khi teacher chấm
  @Column({ type: 'text', nullable: true })
  feedback: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
