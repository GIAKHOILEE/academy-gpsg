import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { RuleType } from '@enums/class.enum'
import { Classes } from '@modules/class/class.entity'

@Entity('course_rules')
export class CourseRule {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Classes, cls => cls.course_rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ nullable: true })
  class_id: number

  // Loại quy tắc
  @Column({ type: 'enum', enum: RuleType })
  type: RuleType // attendance_percentage, teacher_evaluation, score_based

  // Ngưỡng yêu cầu (%)
  @Column({ type: 'float', nullable: true })
  threshold_percentage: number

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
