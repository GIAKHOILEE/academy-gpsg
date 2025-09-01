import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Exam } from '../exam.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Entity({ name: 'exam_scores' })
export class ExamScore {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Exam, exam => exam.scores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam

  @Column()
  exam_id: number

  @ManyToOne(() => ClassStudents, cs => cs.exam_scores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_student_id' })
  class_student: ClassStudents

  @Column()
  class_student_id: number

  @Column({ type: 'float' })
  score: number // điểm của học viên

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
