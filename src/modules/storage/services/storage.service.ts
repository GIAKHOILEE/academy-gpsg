import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageDriverFactory } from './storage-driver.factory'
import { StorageFileService } from './storage-file.service'

/**
 * Lớp mặt tiền cho phần còn lại của hệ thống.
 *
 * Mọi chỗ đang upload file (UploadController, students, teachers, SunEditor...)
 * chỉ cần URL trả về, không quan tâm file nằm ở đâu. Service này giữ đúng hợp đồng
 * cũ - nhận file, trả URL - nên các module hiện có không phải sửa gì, trong khi
 * file mới đã được đưa vào hệ thống quản lý và chia tải.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)

  constructor(
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
    private readonly fileService: StorageFileService,
    private readonly driverFactory: StorageDriverFactory,
  ) {}

  /**
   * Hệ thống quản lý lưu trữ đã sẵn sàng chưa.
   * Chưa cấu hình dịch vụ nào thì các service cũ sẽ tự dùng lại đường cũ qua biến
   * môi trường, nhờ đó bật tính năng này lên không làm gián đoạn gì.
   */
  async isReady(): Promise<boolean> {
    const count = await this.providerRepository.count({ where: { is_enabled: true } })
    return count > 0
  }

  /**
   * Upload và trả về URL công khai.
   * @param subFolder thư mục con theo nghiệp vụ, ví dụ 'pdf', 'avatar'
   */
  async uploadAndGetUrl(file: Express.Multer.File, subFolder?: string): Promise<string> {
    // Truyền folder_path để thư mục được tạo trên đúng dịch vụ mà router chọn
    const outcome = await this.fileService.upload(file, { folder_path: subFolder })

    // Dịch vụ không có URL công khai (Dropbox/OneDrive bị chặn chia sẻ) thì
    // trả link tải tạm thời để nơi gọi vẫn có cái dùng được ngay
    if (outcome.file.url) return outcome.file.url

    const signed = await this.fileService.getSignedUrl(outcome.file.id)
    return signed.url
  }

  async uploadManyAndGetUrls(files: Express.Multer.File[], subFolder?: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) urls.push(await this.uploadAndGetUrl(file, subFolder))
    return urls
  }

  /**
   * Xoá file theo URL - đây là cách code cũ gọi xoá.
   *
   * Tìm trong index trước. Không thấy (file có từ trước khi có tính năng này và
   * chưa quét) thì thử suy ra dịch vụ từ URL để vẫn xoá được.
   *
   * @returns true nếu đã xoá được ở đâu đó
   */
  async deleteByUrl(url: string): Promise<boolean> {
    if (!url || typeof url !== 'string') return false

    const indexed = await this.fileRepository.findOne({ where: { url } })
    if (indexed) {
      // force = true vì đây là lệnh xoá có chủ đích từ nghiệp vụ (đổi ảnh đại diện,
      // xoá bài viết...), nơi gọi đã biết file không còn cần nữa
      await this.fileService.deleteFile(indexed.id, true)
      return true
    }

    return this.deleteUnindexedByUrl(url)
  }

  /* ------------------------------ private ------------------------------ */

  /**
   * Xoá file chưa có trong index: dò xem URL thuộc dịch vụ nào dựa trên
   * public_base_url, rồi cắt lấy object key từ phần còn lại của URL.
   */
  private async deleteUnindexedByUrl(url: string): Promise<boolean> {
    const providers = await this.providerRepository.find({ order: { priority: 'ASC' } })

    for (const provider of providers) {
      if (!provider.public_base_url) continue

      const base = provider.public_base_url.replace(/\/+$/, '')
      if (!url.startsWith(`${base}/`)) continue

      const objectKey = decodeURIComponent(url.slice(base.length + 1).split('?')[0])
      if (!objectKey) continue

      try {
        await this.driverFactory.create(provider).delete(objectKey)
        this.logger.log(`Đã xoá file ngoài danh mục "${objectKey}" trên dịch vụ "${provider.name}"`)
        return true
      } catch (error: any) {
        this.logger.warn(`Không xoá được "${objectKey}" trên "${provider.name}": ${error?.message}`)
      }
    }

    this.logger.warn(`Không xác định được dịch vụ nào đang giữ file: ${url}`)
    return false
  }
}
