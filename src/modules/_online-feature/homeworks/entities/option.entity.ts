import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm'
import { HomeworkQuestion } from './question.entity'

@Entity('homework_options')
export class HomeworkOption {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => HomeworkQuestion, q => q.options, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: HomeworkQuestion

  @Column({ type: 'text' })
  content: string

  // nếu true => option này là đáp án đúng. Nếu multi-correct, nhiều option có isCorrect=true
  @Column({ type: 'boolean', default: false })
  is_correct: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
