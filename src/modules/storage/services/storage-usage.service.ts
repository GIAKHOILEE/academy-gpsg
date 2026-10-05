import { StorageProviderStatus } from '@enums/storage.enum'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageDriverFactory } from './storage-driver.factory'
import { StorageProviderService } from './storage-provider.service'

@Injectable()
export class StorageUsageService {
  private readonly logger = new Logger(StorageUsageService.name)

  constructor(
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
    private readonly driverFactory: StorageDriverFactory,
    private readonly providerService: StorageProviderService,
  ) {}

  /**
   * Hỏi dịch vụ xem đang dùng bao nhiêu rồi ghi vào cache trên provider.
   *
   * Thứ tự ưu tiên nguồn số liệu:
   * 1. API quota của dịch vụ (Drive, Dropbox, OneDrive, Cloudinary, Bunny, R2 có token, Local).
   * 2. Liệt kê toàn bộ object rồi cộng dồn (các dịch vụ S3 khác, Azure).
   * 3. Cộng dồn từ index trong DB - dùng khi 2 cách trên thất bại, để vẫn có số
   *    hiển thị thay vì bỏ trống.
   */
  async refreshProviderUsage(providerId: number) {
    const provider = await this.providerService.findProviderOrFail(providerId)

    try {
      const usage = await this.driverFactory.create(provider).getUsage()

      provider.usage_bytes = usage.usedBytes !== null ? String(usage.usedBytes) : null
      provider.usage_own_bytes = usage.ownBytes !== null && usage.ownBytes !== undefined ? String(usage.ownBytes) : null
      provider.usage_total_bytes = usage.totalBytes !== null ? String(usage.totalBytes) : null
      provider.usage_objects = usage.objectCount !== null ? String(usage.objectCount) : null
      provider.usage_source = usage.source
      provider.usage_checked_at = new Date()

      // Đã hỏi được dung lượng nghĩa là kết nối còn tốt
      if (provider.status === StorageProviderStatus.ERROR) {
        provider.status = StorageProviderStatus.HEALTHY
        provider.status_message = null
      }

      // Đánh dấu đầy để router bỏ qua khi chia tải
      const quota = this.providerService.buildQuota(provider)
      if (quota.used_percent !== null && quota.used_percent >= 100) {
        provider.status = StorageProviderStatus.FULL
        provider.status_message = 'Đã dùng hết hạn mức dung lượng'
      }

      await this.providerRepository.save(provider)
      return this.providerService.buildQuota(provider)
    } catch (error: any) {
      this.logger.warn(`Không lấy được dung lượng của "${provider.name}": ${error?.message}`)

      // Rơi về cộng dồn từ index để UI vẫn có số liệu
      const fallback = await this.sumFromIndex(providerId)
      provider.usage_bytes = String(fallback.bytes)
      provider.usage_objects = String(fallback.files)
      provider.usage_source = 'index'
      provider.usage_checked_at = new Date()
      provider.status = StorageProviderStatus.ERROR
      provider.status_message = `Không lấy được dung lượng: ${error?.message}`.slice(0, 1000)
      await this.providerRepository.save(provider)

      return this.providerService.buildQuota(provider)
    }
  }

  /** Làm mới dung lượng của tất cả dịch vụ. Lỗi một cái không chặn các cái còn lại. */
  async refreshAllUsage() {
    const providers = await this.providerRepository.find({ order: { priority: 'ASC' } })
    const results: { provider_id: number; name: string; ok: boolean; message?: string }[] = []

    for (const provider of providers) {
      try {
        await this.refreshProviderUsage(provider.id)
        results.push({ provider_id: provider.id, name: provider.name, ok: true })
      } catch (error: any) {
        results.push({ provider_id: provider.id, name: provider.name, ok: false, message: error?.message })
      }
    }

    return results
  }

  /**
   * Tổng quan cho trang dashboard: từng dịch vụ + tổng cộng.
   * Đọc từ cache, không gọi ra dịch vụ bên ngoài nên trả về rất nhanh.
   */
  async getOverview() {
    const providers = await this.providerRepository.find({ order: { priority: 'ASC', id: 'ASC' } })

    const items = providers.map(provider => {
      const quota = this.providerService.buildQuota(provider)
      return {
        id: provider.id,
        name: provider.name,
        driver: provider.driver,
        preset: provider.preset,
        is_enabled: provider.is_enabled,
        is_default: provider.is_default,
        is_system: provider.is_system,
        status: provider.status,
        status_message: provider.status_message,
        quota,
        /** Có nhận upload mới được không: phải bật, và không ở trạng thái lỗi/đầy */
        can_accept_upload:
          provider.is_enabled &&
          provider.status !== StorageProviderStatus.ERROR &&
          provider.status !== StorageProviderStatus.FULL &&
          (quota.free_bytes === null || quota.free_bytes > 0),
      }
    })

    // Chỉ cộng tổng những dịch vụ biết được hạn mức, để con số có nghĩa
    const withLimit = items.filter(item => item.quota.total_bytes !== null)
    const totalLimit = withLimit.reduce((sum, item) => sum + item.quota.total_bytes, 0)
    const totalUsedOfLimited = withLimit.reduce((sum, item) => sum + (item.quota.used_bytes || 0), 0)
    const totalUsedAll = items.reduce((sum, item) => sum + (item.quota.used_bytes || 0), 0)
    const totalObjects = items.reduce((sum, item) => sum + (item.quota.object_count || 0), 0)

    const indexedCount = await this.fileRepository.count()
    const indexedSize = await this.fileRepository
      .createQueryBuilder('file')
      .select('COALESCE(SUM(file.size_bytes), 0)', 'total')
      .getRawOne<{ total: string }>()

    return {
      providers: items,
      summary: {
        provider_count: items.length,
        enabled_count: items.filter(item => item.is_enabled).length,
        upload_ready_count: items.filter(item => item.can_accept_upload).length,
        error_count: items.filter(item => item.status === StorageProviderStatus.ERROR).length,
        /** Tổng hạn mức của các dịch vụ biết hạn mức */
        total_limit_bytes: withLimit.length ? totalLimit : null,
        /** Đã dùng, chỉ tính các dịch vụ biết hạn mức - khớp với total_limit_bytes */
        used_of_limited_bytes: withLimit.length ? totalUsedOfLimited : null,
        free_bytes: withLimit.length ? Math.max(totalLimit - totalUsedOfLimited, 0) : null,
        used_percent: withLimit.length && totalLimit > 0 ? Math.round((totalUsedOfLimited / totalLimit) * 10000) / 100 : null,
        /** Đã dùng trên toàn bộ dịch vụ, kể cả cái không biết hạn mức */
        used_all_bytes: totalUsedAll,
        object_count: totalObjects,
        /** Số file hệ thống đang theo dõi trong index */
        indexed_file_count: indexedCount,
        indexed_size_bytes: Number(indexedSize?.total || 0),
      },
    }
  }

  /**
   * Chạy mỗi giờ để số liệu trên dashboard không bị cũ.
   * Tôn trọng cấu hình auto_refresh_usage và usage_refresh_minutes.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledRefresh() {
    const settings = await this.providerService.getSettings()
    if (!settings.auto_refresh_usage) return

    const providers = await this.providerRepository.find()
    const staleThreshold = Date.now() - settings.usage_refresh_minutes * 60 * 1000

    for (const provider of providers) {
      // Bỏ qua cái vừa làm mới gần đây, tránh gọi API dịch vụ không cần thiết
      if (provider.usage_checked_at && provider.usage_checked_at.getTime() > staleThreshold) continue

      try {
        await this.refreshProviderUsage(provider.id)
      } catch (error: any) {
        this.logger.warn(`Làm mới dung lượng theo lịch thất bại cho "${provider.name}": ${error?.message}`)
      }
    }
  }

  /* ------------------------------ private ------------------------------ */

  private async sumFromIndex(providerId: number): Promise<{ bytes: number; files: number }> {
    const row = await this.fileRepository
      .createQueryBuilder('file')
      .select('COALESCE(SUM(file.size_bytes), 0)', 'bytes')
      .addSelect('COUNT(file.id)', 'files')
      .where('file.provider_id = :providerId', { providerId })
      .getRawOne<{ bytes: string; files: string }>()

    return { bytes: Number(row?.bytes || 0), files: Number(row?.files || 0) }
  }
}
