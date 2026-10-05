import { StorageFileKind, StorageFileSource } from '@enums/storage.enum'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { StorageFolderEntity } from './storage-folder.entity'
import { StorageProviderEntity } from './storage-provider.entity'

/**
 * Index của mọi file hệ thống đang quản lý. Đây là nguồn dữ liệu cho trình quản lý
 * file, cho thống kê dung lượng theo dịch vụ, và cho tính năng "file này dùng ở đâu".
 */
@Entity('storage_files')
@Index(['provider_id', 'object_key'], { unique: true })
export class StorageFileEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  provider_id: number

  @ManyToOne(() => StorageProviderEntity, provider => provider.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: StorageProviderEntity

  @Column({ nullable: true })
  @Index()
  folder_id: number

  @ManyToOne(() => StorageFolderEntity, folder => folder.files, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder: StorageFolderEntity

  /**
   * Định danh file trên dịch vụ: key với S3/Azure/Bunny, đường dẫn tương đối với Local,
   * public_id với Cloudinary, file id với Google Drive/OneDrive.
   */
  @Column({ type: 'varchar', length: 1000 })
  object_key: string

  /** Tên file người dùng thấy. */
  @Column({ type: 'varchar', length: 500 })
  name: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  extension: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  mime_type: string

  @Column({ type: 'varchar', length: 20, default: StorageFileKind.OTHER })
  @Index()
  kind: StorageFileKind

  @Column({ type: 'bigint', default: 0 })
  size_bytes: string

  /** URL công khai đang được dùng trong toàn hệ thống. Khoá để tra ngược "dùng ở đâu". */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  @Index()
  url: string

  /** ETag / MD5 do dịch vụ trả về, dùng để phát hiện trùng và kiểm tra toàn vẹn. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  checksum: string

  @Column({ type: 'varchar', length: 20, default: StorageFileSource.UPLOAD })
  source: StorageFileSource

  /** User đã upload. null với file quét về từ dịch vụ. */
  @Column({ nullable: true })
  uploaded_by: number

  /** Số chỗ trong hệ thống đang trỏ tới file này, cache từ lần quét gần nhất. */
  @Column({ type: 'int', nullable: true })
  reference_count: number

  @Column({ type: 'datetime', nullable: true })
  reference_checked_at: Date

  /** Thời điểm sửa đổi trên dịch vụ (LastModified của S3...). */
  @Column({ type: 'datetime', nullable: true })
  remote_modified_at: Date

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
