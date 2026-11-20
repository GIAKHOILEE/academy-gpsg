import { HvmMeetStatus } from '@enums/meeting.enum'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { HVM_MEET_DEFAULT_TEMPLATE_KEY } from '../hvm-meet.constants'
import { HvmMeetRoomPolicy } from '../hvm-meet.policy'

/**
 * Bảng chỉ có 1 dòng (id = 1): cấu hình tích hợp phòng học HVM Meet.
 *
 * Giống `storage_providers`: URL, API key, webhook secret nằm trong `config_encrypted`
 * (AES-256-GCM qua StorageCryptoService), sửa trên trang quản trị là có hiệu lực ngay.
 * Env HVM_MEET_* chỉ dùng để tạo dòng này lần đầu, sau đó không ghi đè nữa.
 */
@Entity('hvm_meet_settings')
export class HvmMeetSettingEntity {
  @PrimaryGeneratedColumn()
  id: number

  /** JSON { base_url, api_key, webhook_secret } đã mã hoá. Không bao giờ trả thẳng ra API. */
  @Column({ type: 'text', nullable: true })
  config_encrypted: string

  /** Tắt = không cấp vé vào phòng (webhook vẫn nhận để không mất điểm danh / bản ghi đang về). */
  @Column({ type: 'boolean', default: false })
  is_enabled: boolean

  /** Mẫu phòng bên HVM Meet dùng khi tạo phòng cho buổi học. */
  @Column({ type: 'varchar', length: 40, default: HVM_MEET_DEFAULT_TEMPLATE_KEY })
  default_template_key: string

  /**
   * Cách vào phòng + điểm danh tự động mặc định cho mọi buổi học HVM Meet (buổi học có thể ghi đè).
   * null = chưa lưu lần nào: meet dùng giá trị kế thừa của nó. simple-json (text), KHÔNG dùng `json`:
   * MariaDB + synchronize tạo lại cột json mỗi lần khởi động và làm mất dữ liệu.
   */
  @Column({ type: 'simple-json', nullable: true })
  room_policy: HvmMeetRoomPolicy | null

  @Column({ type: 'varchar', length: 30, default: HvmMeetStatus.UNKNOWN })
  status: HvmMeetStatus

  /** Kết quả lần "Kiểm tra kết nối" gần nhất. */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  status_message: string

  @Column({ type: 'datetime', nullable: true })
  status_checked_at: Date

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
