import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'
import { ExamScore } from './exam-scores/exam-scores.entity'

@Entity({ name: 'exams' })
export class Exam {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Classes, cls => cls.exams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ nullable: true })
  class_id: number

  @Column()
  name: string // Ví dụ: "15 phút", "45 phút", "Cuối kỳ"

  @Column({ type: 'float' })
  weight_percentage: number // Ví dụ: 10, 30

  @OneToMany(() => ExamScore, examScore => examScore.exam, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  scores: ExamScore[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
