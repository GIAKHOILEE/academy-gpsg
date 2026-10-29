import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum SmsJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
}

@Entity('sms_jobs')
@Index('idx_sms_job_status_priority', ['status', 'priority', 'id'])
@Index('idx_sms_job_device_status', ['device_id', 'status'])
@Index('idx_sms_job_device_dispatched', ['device_id', 'dispatched_at'])
@Index('idx_sms_job_recipient', ['recipient'])
export class SmsJob {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 36, unique: true })
  job_uid: string

  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  idempotency_key: string

  @Column({ type: 'varchar', length: 32 })
  recipient: string

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'int', default: 0 })
  priority: number

  @Column({
    type: 'enum',
    enum: SmsJobStatus,
    default: SmsJobStatus.PENDING,
  })
  status: SmsJobStatus

  @Column({ type: 'varchar', length: 64, nullable: true })
  device_id: string

  @Column({ type: 'varchar', length: 64, nullable: true })
  lock_token: string

  @Column({ type: 'int', default: 0 })
  lock_version: number

  @Column({ type: 'int', default: 0 })
  dispatch_attempts: number

  @Column({ type: 'int', nullable: true })
  parts_total: number

  @Column({ type: 'int', nullable: true })
  parts_sent: number

  @Column({ type: 'int', nullable: true })
  parts_failed: number

  @Column({ type: 'int', default: 0 })
  parts_delivered: number

  @Column({ type: 'json', nullable: true })
  part_results: any

  @Column({ type: 'datetime', nullable: true })
  dispatched_at: Date

  @Column({ type: 'datetime', nullable: true })
  accepted_at: Date

  @Column({ type: 'datetime', nullable: true })
  submitted_at: Date

  @Column({ type: 'datetime', nullable: true })
  delivered_at: Date

  @Column({ type: 'datetime', nullable: true })
  failed_at: Date

  @Column({ type: 'datetime', nullable: true })
  unknown_at: Date

  @Column({ type: 'datetime', nullable: true })
  reconciled_at: Date

  @Column({ type: 'varchar', length: 64, nullable: true })
  error_code: string

  @Column({ type: 'text', nullable: true })
  error_message: string

  @Column({ type: 'int', nullable: true })
  created_by: number

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
