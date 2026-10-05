import { StorageDriver, StorageProviderStatus } from '@enums/storage.enum'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { StorageFileEntity } from './storage-file.entity'
import { StorageFolderEntity } from './storage-folder.entity'

/**
 * Một dòng = một dịch vụ lưu trữ đã được cấu hình (một bucket R2, một Google Drive,
 * một thư mục trên ổ đĩa...). Toàn bộ key/secret nằm trong `config_encrypted`.
 */
@Entity('storage_providers')
export class StorageProviderEntity {
  @PrimaryGeneratedColumn()
  id: number

  /** Tên cho người dùng đọc, ví dụ "R2 chính", "Drive dự phòng" */
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 50 })
  @Index()
  driver: StorageDriver

  /** Với driver S3: id preset (cloudflare_r2, aws_s3...). Driver khác để trống. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  preset: string

  /** JSON config đã mã hoá AES-256-GCM. Không bao giờ trả thẳng ra API. */
  @Column({ type: 'text', nullable: true })
  config_encrypted: string

  /** Bật = được chọn để upload file mới. Tắt = chỉ đọc (file cũ vẫn lấy ra bình thường). */
  @Column({ type: 'boolean', default: true })
  is_enabled: boolean

  /** Dịch vụ mặc định khi chiến lược là single_default, hoặc khi chỉ định rõ. */
  @Column({ type: 'boolean', default: false })
  is_default: boolean

  /**
   * true = dịch vụ được sinh tự động từ biến môi trường (R2_*, CLOUDINARY_*, STORAGE_PATH).
   * Vẫn sửa/xoá được, nhưng seeder sẽ không tạo lại nếu đã tồn tại.
   */
  @Column({ type: 'boolean', default: false })
  is_system: boolean

  /** Số nhỏ = ưu tiên cao. Dùng cho chiến lược priority_fill và để sắp xếp UI. */
  @Column({ type: 'int', default: 100 })
  priority: number

  /** Trọng số cho chiến lược weighted_round_robin. */
  @Column({ type: 'int', default: 1 })
  weight: number

  /**
   * Hạn mức bạn tự đặt (byte). Cần với các dịch vụ S3 không có API quota -
   * ví dụ R2 free 10GB thì đặt 10737418240 để biết còn bao nhiêu.
   * null = không giới hạn / lấy theo API của dịch vụ.
   */
  @Column({ type: 'bigint', nullable: true })
  quota_limit_bytes: string

  /** Chặn upload khi file mới vượt quá kích thước này (byte). null = không chặn. */
  @Column({ type: 'bigint', nullable: true })
  max_file_size_bytes: string

  /**
   * Danh sách mime được phép, phân cách bằng dấu phẩy, hỗ trợ dạng "image/*".
   * Để trống = nhận mọi loại file.
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  allowed_mime_types: string

  /** Tiền tố thêm vào trước mọi key khi upload, ví dụ "hvm/2026". */
  @Column({ type: 'varchar', length: 255, nullable: true })
  path_prefix: string

  /** Domain công khai để ghép link file, ví dụ https://file.hvmv.edu.vn */
  @Column({ type: 'varchar', length: 500, nullable: true })
  public_base_url: string

  @Column({ type: 'varchar', length: 30, default: StorageProviderStatus.UNKNOWN })
  status: StorageProviderStatus

  /** Thông báo lỗi gần nhất khi test kết nối / refresh dung lượng. */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  status_message: string

  @Column({ type: 'datetime', nullable: true })
  status_checked_at: Date

  /* ---- Cache dung lượng, cập nhật bởi StorageUsageService ---- */

  @Column({ type: 'bigint', nullable: true })
  usage_bytes: string

  /** Tổng dung lượng do chính dịch vụ báo (Drive/Dropbox/OneDrive/Cloudinary). */
  @Column({ type: 'bigint', nullable: true })
  usage_total_bytes: string

  /**
   * Dung lượng do riêng phần của ta chiếm, khi nó khác `usage_bytes`.
   * Local: usage_bytes là mức dùng cả phân vùng ổ đĩa, usage_own_bytes là thư mục ta quản lý.
   * Google Drive: usage_bytes gồm cả Gmail/Photos, usage_own_bytes chỉ phần Drive.
   */
  @Column({ type: 'bigint', nullable: true })
  usage_own_bytes: string

  @Column({ type: 'bigint', nullable: true })
  usage_objects: string

  /** Nguồn của số liệu: provider_api | listing | index */
  @Column({ type: 'varchar', length: 30, nullable: true })
  usage_source: string

  @Column({ type: 'datetime', nullable: true })
  usage_checked_at: Date

  /** Con trỏ xoay vòng, chỉ dùng cho weighted_round_robin. */
  @Column({ type: 'int', default: 0 })
  round_robin_counter: number

  @OneToMany(() => StorageFileEntity, file => file.provider)
  files: StorageFileEntity[]

  @OneToMany(() => StorageFolderEntity, folder => folder.provider)
  folders: StorageFolderEntity[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
