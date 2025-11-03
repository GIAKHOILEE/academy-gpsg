import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Questions } from '../questions/questions.entity'
import { Student } from '@modules/students/students.entity'

@Entity()
export class Answers {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  class_id: number

  @Column()
  semester_id: number

  @Column()
  scholastic_id: number

  @Column()
  student_id: number

  @ManyToOne(() => Student, student => student.id, { eager: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @ManyToOne(() => Questions, question => question.id, { eager: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Questions

  @Column({ type: 'int' })
  question_id: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  answer_text: string

  @Column({ type: 'int', nullable: true })
  answer_number: number

  @Column({ type: 'int', nullable: true })
  answer_single_choice: number

  @Column({ type: 'json', nullable: true })
  answer_multiple_choice: number[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
