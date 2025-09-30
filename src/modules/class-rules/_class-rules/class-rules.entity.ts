import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { RuleType } from '@enums/class.enum'
import { Classes } from '@modules/class/class.entity'

@Entity('class_rules')
export class ClassRule {
  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Classes, cls => cls.rule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ nullable: true })
  class_id: number

  // Loại quy tắc
  @Column({ type: 'enum', enum: RuleType })
  type: RuleType // attendance_percentage, teacher_evaluation, score_based, attendance_percentage_and_score_based

  // Ngưỡng yêu cầu (%) type: 1, 4
  @Column({ type: 'float', nullable: true })
  attendance_percent: number

  // Ngưỡng yêu cầu type: 2, 4
  @Column({ type: 'float', nullable: true })
  score: number

  // Mô tả
  @Column({ type: 'text', nullable: true })
  description: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

/*

ERD cho việc thêm quy tắc đánh giá
Classes
 ├── ClassStudents
 │     ├── Attendance
 │     ├── TeacherEvaluation
 │     └── ExamScore
 ├── CourseRule
 ├── Exam
 │     └── ExamScore
 ├── AttendanceRule

*/
