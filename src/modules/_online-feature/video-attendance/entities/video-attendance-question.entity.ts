import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'

/**
 * Câu hỏi kiểm tra "còn đang học" bật lên giữa lúc xem video. lesson_id null = dùng cho mọi
 * buổi của lớp; buổi nào có câu hỏi riêng thì ưu tiên câu hỏi riêng.
 * Đáp án KHÔNG bao giờ gửi xuống trình duyệt học viên — chỉ server so khớp.
 */
@Entity('video_attendance_questions')
export class VideoAttendanceQuestion {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  class_id: number

  @ManyToOne(() => Classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ type: 'int', nullable: true })
  lesson_id: number | null

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

  @Column({ type: 'text' })
  question: string

  // CHOICE | TEXT
  @Column({ type: 'varchar', length: 10, default: 'CHOICE' })
  type: string

  @Column({ type: 'simple-json', nullable: true })
  options: string[] | null

  @Column({ type: 'int', nullable: true })
  correct_option: number | null

  @Column({ type: 'simple-json', nullable: true })
  accepted_answers: string[] | null

  @Column({ type: 'boolean', default: true })
  is_active: boolean

  @Column({ type: 'int', nullable: true })
  created_by_user_id: number | null

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date
}
