import { StorageStrategy } from '@enums/storage.enum'
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * Bảng chỉ có 1 dòng (id = 1), giữ cấu hình chung của hệ thống lưu trữ.
 */
@Entity('storage_settings')
export class StorageSettingEntity {
  @PrimaryGeneratedColumn()
  id: number

  /** Cách chọn dịch vụ khi nhiều dịch vụ cùng bật. */
  @Column({ type: 'varchar', length: 40, default: StorageStrategy.MOST_FREE })
  strategy: StorageStrategy

  /** Với priority_fill: dùng tới bao nhiêu % thì tràn sang dịch vụ tiếp theo. */
  @Column({ type: 'int', default: 95 })
  fill_threshold_percent: number

  /** Tự làm mới số liệu dung lượng theo giờ. */
  @Column({ type: 'boolean', default: true })
  auto_refresh_usage: boolean

  /** Số phút giữa 2 lần tự làm mới dung lượng. */
  @Column({ type: 'int', default: 60 })
  usage_refresh_minutes: number

  @UpdateDateColumn()
  updated_at: Date
}
