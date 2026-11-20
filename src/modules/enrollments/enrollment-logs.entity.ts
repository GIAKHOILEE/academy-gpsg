import { EnrollmentLogAction, EnrollmentLogActorType } from '@enums/enrollment-log.enum'
import { Role } from '@enums/role.enum'
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export interface EnrollmentLogFieldChange {
  old: any
  new: any
}

export type EnrollmentLogChanges = Record<string, EnrollmentLogFieldChange>

export interface EnrollmentLogClassSnapshot {
  class_id: number
  class_code: string | null
  class_name: string | null
  price: number | null
  learn_type: number
}

export interface EnrollmentLogSnapshot {
  id: number
  code: string | null
  registration_date: string | null
  payment_method: number | null
  payment_status: number | null
  status: number | null
  voucher_code: string | null
  discount: number
  class_ids: EnrollmentLogClassSnapshot[]
  total_fee: number
  prepaid: number
  debt: number
  note: string | null
  user_note: string | null
  is_read_note: boolean | null
  is_logged: boolean
  saint_name: string | null
  gender: number | null
  full_name: string | null
  email: string | null
  phone_number: string | null
  birth_date: string | null
  address: string | null
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_note: string | null
  birth_place: string | null
  parish: string | null
  deanery: string | null
  diocese: string | null
  congregation: string | null
  student_id: number | null
  student_code: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

/**
 * Lịch sử thao tác trên đơn đăng ký (append-only audit log).
 *
 * Cố ý KHÔNG tạo Foreign Key sang `enrollments` hay `user` để bản ghi log luôn
 * tồn tại vĩnh viễn kể cả sau khi đơn bị xóa cứng (`DELETE /admin/enrollments/:id`)
 * hoặc tài khoản người thao tác bị xóa.
 */
@Entity('enrollment_logs')
@Index('idx_enrollment_logs_enrollment_created', ['enrollment_id', 'created_at'])
@Index('idx_enrollment_logs_code', ['enrollment_code'])
@Index('idx_enrollment_logs_actor_created', ['actor_id', 'created_at'])
@Index('idx_enrollment_logs_action_created', ['action', 'created_at'])
@Index('idx_enrollment_logs_created_at', ['created_at'])
export class EnrollmentLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  enrollment_id: number

  @Column({ type: 'varchar', length: 50, nullable: true })
  enrollment_code: string | null

  @Column({ type: 'int', nullable: true })
  student_id: number | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  student_name: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  student_name_normalized: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  student_code: string | null

  @Column({ type: 'varchar', length: 50 })
  action: EnrollmentLogAction

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null

  @Column({ type: 'varchar', length: 20, default: EnrollmentLogActorType.USER })
  actor_type: EnrollmentLogActorType

  @Column({ type: 'int', nullable: true })
  actor_id: number | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  actor_name: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  actor_username: string | null

  @Column({ type: 'tinyint', nullable: true })
  actor_role: Role | null

  @Column({ type: 'json', nullable: true })
  changes: EnrollmentLogChanges | null

  @Column({ type: 'json', nullable: true })
  snapshot: EnrollmentLogSnapshot | null

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null

  @CreateDateColumn()
  created_at: Date
}
