import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'

/**
 * Cấu hình điểm danh qua video của một lớp. Lớp chưa có bản ghi = dùng DEFAULT_SETTINGS
 * (video-attendance.logic.ts) — giá trị mặc định ở đây phải khớp với hằng đó.
 */
@Entity('class_video_attendance_configs')
export class ClassVideoAttendanceConfig {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int', unique: true })
  class_id: number

  @OneToOne(() => Classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column({ type: 'boolean', default: true })
  enabled: boolean

  // PERCENT | ANY_VIEW
  @Column({ type: 'varchar', length: 20, default: 'PERCENT' })
  mode: string

  @Column({ type: 'float', default: 50 })
  required_percent: number

  @Column({ type: 'int', default: 60 })
  min_view_seconds: number

  // ANY | ALL
  @Column({ type: 'varchar', length: 10, default: 'ANY' })
  multi_video_rule: string

  @Column({ type: 'boolean', default: false })
  block_seek_forward: boolean

  @Column({ type: 'float', default: 2 })
  max_playback_rate: number

  @Column({ type: 'boolean', default: false })
  pause_when_hidden: boolean

  // Danh sách LearnType cách nhau dấu phẩy, vd "2,3"
  @Column({ type: 'varchar', length: 20, default: '2,3' })
  eligible_learn_types: string

  @Column({ type: 'int', nullable: true })
  late_after_days: number | null

  @Column({ type: 'int', nullable: true })
  deadline_days: number | null

  @Column({ type: 'boolean', default: false })
  idle_check_enabled: boolean

  // CONFIRM | QUESTION
  @Column({ type: 'varchar', length: 20, default: 'QUESTION' })
  idle_check_mode: string

  @Column({ type: 'float', default: 10 })
  idle_check_interval_minutes: number

  @Column({ type: 'int', default: 60 })
  idle_check_timeout_seconds: number

  @Column({ type: 'int', default: 2 })
  idle_check_max_attempts: number

  @Column({ type: 'boolean', default: true })
  idle_check_discard_on_fail: boolean

  @Column({ type: 'int', nullable: true })
  updated_by_user_id: number | null

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date
}
