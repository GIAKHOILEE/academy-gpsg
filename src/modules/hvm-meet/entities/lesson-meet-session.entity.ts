import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * Một lần phòng HVM Meet của buổi học thực sự diễn ra (một "session" bên HVM Meet).
 * Một buổi học có thể có nhiều session (rớt mạng, mở lại phòng...). Dùng để liệt kê
 * "Xem lại buổi học" và xin vé trang xem lại (video + trò chuyện + cảm xúc + sự kiện).
 *
 * Ghi bởi webhook room.started / room.ended / recording.ready / attendance.finalized
 * (idempotent theo session_id), và đồng bộ bù từ GET /v1/integration/rooms/{externalId}/sessions.
 */
@Entity('lesson_meet_sessions')
@Index('idx_lesson_meet_sessions_lesson', ['lesson_id'])
export class LessonMeetSession {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  lesson_id: number

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

  // id session bên HVM Meet (uuid)
  @Column({ type: 'varchar', length: 64, unique: true })
  session_id: string

  // id phòng bên HVM Meet (uuid)
  @Column({ type: 'varchar', length: 64, nullable: true })
  room_id: string

  @Column({ type: 'datetime', nullable: true })
  started_at: Date

  // null = đang diễn ra (hoặc chưa nhận được room.ended)
  @Column({ type: 'datetime', nullable: true })
  ended_at: Date

  @Column({ type: 'int', nullable: true })
  peak_participants: number

  // Đã có ít nhất một bản ghi hình phát lại được
  @Column({ type: 'boolean', default: false })
  recording_ready: boolean

  // HVM Meet đã chốt điểm danh (và academy đã ghi vào bảng điểm danh)
  @Column({ type: 'boolean', default: false })
  attendance_finalized: boolean

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
