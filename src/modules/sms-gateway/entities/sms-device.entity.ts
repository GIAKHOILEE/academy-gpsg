import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum SmsDeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

@Entity('sms_devices')
@Index('idx_sms_device_status', ['status'])
@Index('idx_sms_device_active_status', ['is_active', 'status'])
export class SmsDevice {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 64, unique: true })
  device_id: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'varchar', length: 255, select: false })
  secret_hash: string

  @Column({
    type: 'enum',
    enum: SmsDeviceStatus,
    default: SmsDeviceStatus.OFFLINE,
  })
  status: SmsDeviceStatus

  @Column({ type: 'boolean', default: true })
  is_active: boolean

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone_number: string

  @Column({ type: 'int', nullable: true })
  sim_sub_id: number

  @Column({ type: 'varchar', length: 32, nullable: true })
  app_version: string

  @Column({ type: 'int', default: 10 })
  rate_limit_per_minute: number

  @Column({ type: 'int', default: 200 })
  daily_limit: number

  @Column({ type: 'datetime', nullable: true })
  last_seen_at: Date

  @Column({ type: 'datetime', nullable: true })
  last_connected_at: Date

  @Column({ type: 'datetime', nullable: true })
  last_disconnected_at: Date

  @Column({ type: 'varchar', length: 64, nullable: true })
  last_ip: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
