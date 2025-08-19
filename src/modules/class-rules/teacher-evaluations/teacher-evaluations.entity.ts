import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { TeacherEvaluationStatus } from '@enums/class.enum'

@Entity({ name: 'teacher_evaluations' })
export class TeacherEvaluation {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => ClassStudents, cs => cs.teacher_evaluations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_student_id' })
  class_student: ClassStudents

  @Column()
  class_student_id: number

  // Đạt hay không
  @Column({ type: 'enum', enum: TeacherEvaluationStatus, nullable: true })
  status: TeacherEvaluationStatus

  @Column({ type: 'text', nullable: true })
  note: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
