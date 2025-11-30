import { Student } from '@modules/students/students.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'
import { ExamScore } from '@modules/class-rules/exam/exam-scores/exam-scores.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { TeacherEvaluation } from '@modules/class-rules/teacher-evaluations/teacher-evaluations.entity'
import { LearnType } from '@enums/class.enum'

@Entity({ name: 'class_students' })
export class ClassStudents {
  @PrimaryGeneratedColumn()
  id: number

  // Điểm số
  @Column({ type: 'float', nullable: true })
  score: number

  @ManyToOne(() => Classes, classes => classes.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column()
  class_id: number

  @ManyToOne(() => Student, student => student.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column()
  student_id: number

  @Column({ type: 'enum', enum: LearnType, default: LearnType.OFFLINE })
  learn_type: LearnType

  @OneToMany(() => ExamScore, examScore => examScore.class_student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  exam_scores: ExamScore[]

  @OneToMany(() => Attendance, attendance => attendance.class_student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  attendances: Attendance[]

  @OneToMany(() => TeacherEvaluation, teacherEvaluation => teacherEvaluation.class_student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  teacher_evaluations: TeacherEvaluation[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
