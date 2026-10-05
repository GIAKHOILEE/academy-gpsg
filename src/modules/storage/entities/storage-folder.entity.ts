import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { StorageFileEntity } from './storage-file.entity'
import { StorageProviderEntity } from './storage-provider.entity'

/**
 * Thư mục trong trình quản lý file. Mỗi thư mục thuộc về đúng một dịch vụ.
 * - Với dịch vụ S3/Azure: thư mục là prefix của key (không tồn tại thật).
 * - Với Local/Drive/Dropbox/OneDrive/Bunny: thư mục là thư mục thật trên dịch vụ,
 *   `remote_id` giữ id do dịch vụ cấp (Drive/OneDrive dùng id chứ không dùng path).
 */
@Entity('storage_folders')
@Index(['provider_id', 'path'], { unique: true })
export class StorageFolderEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  provider_id: number

  @ManyToOne(() => StorageProviderEntity, provider => provider.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: StorageProviderEntity

  @Column({ nullable: true })
  @Index()
  parent_id: number

  @ManyToOne(() => StorageFolderEntity, folder => folder.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: StorageFolderEntity

  @OneToMany(() => StorageFolderEntity, folder => folder.parent)
  children: StorageFolderEntity[]

  @OneToMany(() => StorageFileEntity, file => file.folder)
  files: StorageFileEntity[]

  @Column({ type: 'varchar', length: 255 })
  name: string

  /**
   * Đường dẫn đầy đủ tính từ gốc của dịch vụ, không có dấu / ở đầu và cuối.
   *
   * Độ dài tối đa 700 ký tự vì cột này nằm trong index unique cùng provider_id:
   * InnoDB giới hạn khoá index 3072 byte, mà utf8mb4 tốn 4 byte/ký tự
   * (700 x 4 + 4 byte của int = 2804 byte).
   */
  @Column({ type: 'varchar', length: 700 })
  path: string

  /** Id thư mục do dịch vụ cấp (Google Drive, OneDrive). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  remote_id: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
