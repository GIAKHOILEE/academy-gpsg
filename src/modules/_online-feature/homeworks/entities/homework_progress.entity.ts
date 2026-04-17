import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm'

@Entity('homework_progress')
export class HomeworkProgress {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  student_id: number

  @Column({ type: 'int' })
  homework_id: number

  // lưu theo số giây
  @Column({ type: 'int', nullable: true })
  time_limit: number

  // thời gian bắt đầu làm bài thực tế
  @CreateDateColumn()
  start_time: Date

  // thời gian kết thúc làm bài thực tế
  @Column({ nullable: true })
  end_time: Date

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
