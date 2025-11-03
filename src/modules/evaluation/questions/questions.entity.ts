import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { QuestionType } from '../../../enums/evaluation.enum'
import { Answers } from '../answers/answers.entity'

@Entity()
export class Questions {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  question: string

  @Column()
  type: QuestionType

  @Column({ type: 'json', nullable: true })
  options: string[]

  @OneToMany(() => Answers, answer => answer.question, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  answers: Answers[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
