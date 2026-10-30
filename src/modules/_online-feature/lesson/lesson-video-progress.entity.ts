import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Lesson } from './lesson.entity'
import { Student } from '@modules/students/students.entity'

@Entity('lesson_video_progress')
export class LessonVideoProgress {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  lesson_id: number

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

  @Column({ type: 'int' })
  student_id: number

  @ManyToOne(() => Student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  // Vị trí dừng lại gần nhất của video (giây) - dùng để resume video
  @Column({ type: 'float', default: 0 })
  last_position: number

  // Tổng thời lượng thực tế đã xem (giây) - chống tua gian lận
  @Column({ type: 'float', default: 0 })
  watched_seconds: number

  // Tổng độ dài video (giây)
  @Column({ type: 'float', default: 0 })
  total_duration: number

  // Đã xem đạt tỷ lệ % yêu cầu của bài học hay chưa
  @Column({ type: 'boolean', default: false })
  is_completed: boolean

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date
}
