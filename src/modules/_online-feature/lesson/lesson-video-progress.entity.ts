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

  // Tổng số giây video ĐÃ XÁC NHẬN xem thật, không trùng lặp (= độ dài watched_ranges)
  @Column({ type: 'float', default: 0 })
  watched_seconds: number

  // Mỗi video của buổi một dòng. '' = dòng cũ trước khi tách theo video (tự nhận khi xem lại)
  @Column({ type: 'varchar', length: 64, default: '' })
  video_key: string

  @Column({ type: 'text', nullable: true })
  video_url: string | null

  // Các đoạn [bắt đầu, kết thúc] (giây) đã xác nhận xem — đã gộp, không chồng nhau
  @Column({ type: 'simple-json', nullable: true })
  watched_ranges: [number, number][] | null

  // Đoạn đã xem nhưng chờ qua bài kiểm tra "còn đang học" mới được tính
  @Column({ type: 'simple-json', nullable: true })
  pending_ranges: [number, number][] | null

  // Giây đã xem kể từ lần kiểm tra gần nhất (tính cả xem lại) — để hẹn lần kiểm tra kế tiếp
  @Column({ type: 'float', default: 0 })
  since_check_seconds: number

  @Column({ type: 'float', nullable: true })
  next_check_after_seconds: number | null

  // Bài kiểm tra đang chờ trả lời: { id, question_id, issued_at, expires_at, attempts }
  @Column({ type: 'simple-json', nullable: true })
  active_check: Record<string, any> | null

  @Column({ type: 'int', default: 0 })
  checks_passed: number

  @Column({ type: 'int', default: 0 })
  checks_failed: number

  // Kết quả kiểm tra gần nhất (báo cho học viên một lần): { result, discarded_seconds, at }
  @Column({ type: 'simple-json', nullable: true })
  last_check_result: Record<string, any> | null

  @Column({ type: 'datetime', nullable: true })
  last_heartbeat_at: Date | null

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date | null

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
