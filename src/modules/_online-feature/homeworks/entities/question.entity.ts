import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm'
import { Homeworks } from './homeworks.entity'
import { HomeworkOption } from './option.entity'
import { QuestionType } from 'src/enums/homework.enum'

@Entity('homework_questions')
export class HomeworkQuestion {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Homeworks, h => h.questions, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'homework_id' })
  homework: Homeworks

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType

  // điểm cho câu hỏi (một số hệ thống: cân bằng theo số câu, nhưng nên lưu tĩnh)
  @Column({ type: 'float', default: 1 })
  points: number

  @OneToMany(() => HomeworkOption, o => o.question, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  options: HomeworkOption[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
