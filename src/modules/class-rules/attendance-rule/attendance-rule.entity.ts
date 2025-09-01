import { AttendanceRuleType } from '@enums/class.enum'
import { Classes } from '@modules/class/class.entity'
import { Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, UpdateDateColumn, Entity } from 'typeorm'

@Entity('attendance_rules')
export class AttendanceRule {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Classes, cls => cls.attendance_rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column()
  class_id: number

  // Loại học bình thường/học bù/thi/nghỉ
  @Column({ type: 'enum', enum: AttendanceRuleType, default: AttendanceRuleType.REGULAR })
  type: AttendanceRuleType

  // Ngày học
  @Column()
  lesson_date: string

  // thời gian nhận thẻ
  @Column()
  card_start_time: string

  // thời gian kết thúc nhận thẻ
  @Column()
  card_end_time: string

  // thời gian cho phép trễ tính từ sau thời gian nhận thẻ
  @Column({ type: 'int', default: 0 })
  delay: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
