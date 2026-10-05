import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { StorageProviderStatus, StorageStrategy } from '@enums/storage.enum'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageProviderService } from './storage-provider.service'

/** Thông tin file cần upload, dùng để loại các dịch vụ không nhận được nó. */
export interface StorageRouteRequest {
  sizeBytes: number
  mimeType: string
  /** Bắt buộc dùng dịch vụ này (người dùng chọn tay trên UI). */
  preferredProviderId?: number
}

export interface StorageRouteDecision {
  provider: StorageProviderEntity
  strategy: StorageStrategy | 'explicit'
  /** Lý do chọn, trả về cho UI để người dùng hiểu file đi đâu và vì sao. */
  reason: string
  /** Các dịch vụ bị loại kèm lý do - rất hữu ích khi debug "sao không upload được". */
  rejected: { provider_id: number; name: string; reason: string }[]
}

/**
 * Quyết định file mới được upload vào dịch vụ nào.
 *
 * Nguyên tắc: "tắt" chỉ có nghĩa là không nhận file mới. File đã nằm trên dịch vụ
 * bị tắt vẫn đọc/xoá/di chuyển được bình thường, vì đó vẫn là file của mình.
 */
@Injectable()
export class StorageRouterService {
  private readonly logger = new Logger(StorageRouterService.name)

  constructor(
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    private readonly providerService: StorageProviderService,
  ) {}

  async route(request: StorageRouteRequest): Promise<StorageRouteDecision> {
    // Người dùng chỉ định rõ thì tôn trọng, chỉ kiểm tra các điều kiện cứng
    if (request.preferredProviderId) {
      const provider = await this.providerService.findProviderOrFail(request.preferredProviderId)
      const rejection = this.rejectionReason(provider, request, { ignoreEnabled: true })
      if (rejection) {
        throwAppException(this.errorMessageFor(rejection), this.errorCodeFor(rejection), HttpStatus.BAD_REQUEST, {
          provider: provider.name,
          reason: rejection,
        })
      }
      return {
        provider,
        strategy: 'explicit',
        reason: `Bạn đã chỉ định dịch vụ "${provider.name}"`,
        rejected: [],
      }
    }

    const settings = await this.providerService.getSettings()
    const all = await this.providerRepository.find({ order: { priority: 'ASC', id: 'ASC' } })

    const rejected: StorageRouteDecision['rejected'] = []
    const candidates: StorageProviderEntity[] = []

    for (const provider of all) {
      const rejection = this.rejectionReason(provider, request)
      if (rejection) {
        rejected.push({ provider_id: provider.id, name: provider.name, reason: rejection })
        continue
      }
      candidates.push(provider)
    }

    if (!candidates.length) {
      // Nêu rõ từng dịch vụ bị loại vì sao, nếu không thì lỗi "không có dịch vụ nào"
      // sẽ rất khó lần ra nguyên nhân
      throwAppException('STORAGE_NO_PROVIDER_AVAILABLE', ErrorCode.STORAGE_NO_PROVIDER_AVAILABLE, HttpStatus.BAD_REQUEST, {
        rejected: rejected.map(item => `${item.name}: ${this.describeRejection(item.reason)}`).join('; '),
      })
    }

    const chosen = await this.pick(candidates, settings.strategy, settings.fill_threshold_percent)
    return { ...chosen, rejected }
  }

  /* ------------------------------ private ------------------------------ */

  /**
   * Áp dụng chiến lược chia tải lên danh sách ứng viên đã lọc.
   * Mỗi nhánh tự lo trường hợp không đủ dữ liệu để quyết định.
   */
  private async pick(
    candidates: StorageProviderEntity[],
    strategy: StorageStrategy,
    fillThreshold: number,
  ): Promise<Omit<StorageRouteDecision, 'rejected'>> {
    switch (strategy) {
      case StorageStrategy.SINGLE_DEFAULT: {
        const chosen = candidates.find(provider => provider.is_default) || candidates[0]
        return {
          provider: chosen,
          strategy,
          reason: chosen.is_default ? `Dùng dịch vụ mặc định "${chosen.name}"` : `Dịch vụ mặc định không khả dụng, dùng "${chosen.name}"`,
        }
      }

      case StorageStrategy.PRIORITY_FILL: {
        // Lấp đầy dịch vụ ưu tiên cao trước, chỉ tràn sang cái sau khi đã vượt ngưỡng
        for (const provider of candidates) {
          const percent = this.providerService.buildQuota(provider).used_percent
          if (percent === null || percent < fillThreshold) {
            return {
              provider,
              strategy,
              reason:
                percent === null
                  ? `"${provider.name}" ưu tiên cao nhất và chưa biết mức dùng`
                  : `"${provider.name}" ưu tiên cao nhất và mới dùng ${percent}% (ngưỡng tràn ${fillThreshold}%)`,
            }
          }
        }
        // Tất cả đều quá ngưỡng nhưng vẫn còn chỗ: dùng cái trống nhất
        return this.pickMostFree(candidates, strategy, `Mọi dịch vụ đều vượt ngưỡng ${fillThreshold}%`)
      }

      case StorageStrategy.WEIGHTED_ROUND_ROBIN:
        return this.pickWeighted(candidates, strategy)

      case StorageStrategy.MOST_FREE:
      default:
        return this.pickMostFree(candidates, StorageStrategy.MOST_FREE)
    }
  }

  /** Chọn dịch vụ còn trống nhiều nhất theo %. Không biết % thì xếp sau cùng theo priority. */
  private pickMostFree(candidates: StorageProviderEntity[], strategy: StorageStrategy, prefixReason = ''): Omit<StorageRouteDecision, 'rejected'> {
    const scored = candidates.map(provider => {
      const quota = this.providerService.buildQuota(provider)
      return { provider, quota, freePercent: quota.used_percent === null ? null : 100 - quota.used_percent }
    })

    const known = scored.filter(item => item.freePercent !== null)

    if (!known.length) {
      // Không dịch vụ nào biết hạn mức (ví dụ toàn S3 chưa đặt quota):
      // không có cơ sở so sánh, rơi về priority
      const chosen = candidates[0]
      return {
        provider: chosen,
        strategy,
        reason: `${prefixReason ? `${prefixReason}. ` : ''}Chưa dịch vụ nào có hạn mức để so sánh, dùng "${chosen.name}" theo thứ tự ưu tiên`,
      }
    }

    known.sort((a, b) => {
      if (b.freePercent !== a.freePercent) return b.freePercent - a.freePercent
      // Trống bằng nhau thì theo dung lượng trống tuyệt đối, rồi tới priority
      const freeDiff = (b.quota.free_bytes || 0) - (a.quota.free_bytes || 0)
      if (freeDiff !== 0) return freeDiff
      return a.provider.priority - b.provider.priority
    })

    const best = known[0]
    return {
      provider: best.provider,
      strategy,
      reason: `${prefixReason ? `${prefixReason}. ` : ''}"${best.provider.name}" còn trống nhiều nhất (${Math.round(best.freePercent * 100) / 100}%)`,
    }
  }

  /**
   * Round-robin có trọng số, dùng counter lưu trong DB.
   *
   * Cách làm: cộng counter của dịch vụ được chọn lên 1, rồi lần sau chọn dịch vụ
   * có tỉ lệ counter/weight nhỏ nhất. Qua nhiều lần upload, số file mỗi dịch vụ
   * nhận sẽ tiệm cận đúng tỉ lệ weight, và trạng thái vẫn đúng sau khi restart.
   */
  private async pickWeighted(candidates: StorageProviderEntity[], strategy: StorageStrategy): Promise<Omit<StorageRouteDecision, 'rejected'>> {
    const scored = candidates.map(provider => ({
      provider,
      ratio: provider.round_robin_counter / Math.max(provider.weight, 1),
    }))

    scored.sort((a, b) => {
      if (a.ratio !== b.ratio) return a.ratio - b.ratio
      return a.provider.priority - b.provider.priority
    })

    const chosen = scored[0].provider
    chosen.round_robin_counter += 1

    // Tránh counter phình vô hạn: khi mọi ứng viên đều đã quay đủ 1 vòng thì trừ đi
    const minRatio = Math.min(...candidates.map(provider => provider.round_robin_counter / Math.max(provider.weight, 1)))
    if (minRatio >= 1000) {
      for (const provider of candidates) {
        provider.round_robin_counter = Math.max(provider.round_robin_counter - Math.floor(minRatio) * Math.max(provider.weight, 1), 0)
      }
      await this.providerRepository.save(candidates)
    } else {
      await this.providerRepository.save(chosen)
    }

    return {
      provider: chosen,
      strategy,
      reason: `Xoay vòng theo trọng số, lượt này thuộc "${chosen.name}" (weight ${chosen.weight})`,
    }
  }

  /**
   * Trả về lý do một dịch vụ không nhận được file này, hoặc null nếu nhận được.
   * `ignoreEnabled` dùng khi người dùng chỉ định tay - lúc đó việc dịch vụ đang
   * tắt không nên chặn họ, nhưng hết dung lượng thì vẫn phải chặn.
   */
  private rejectionReason(provider: StorageProviderEntity, request: StorageRouteRequest, options: { ignoreEnabled?: boolean } = {}): string | null {
    if (!options.ignoreEnabled && !provider.is_enabled) return 'disabled'
    if (provider.status === StorageProviderStatus.ERROR) return 'error'
    if (provider.status === StorageProviderStatus.FULL) return 'full'

    if (provider.max_file_size_bytes && request.sizeBytes > Number(provider.max_file_size_bytes)) {
      return 'file_too_large'
    }

    if (provider.allowed_mime_types && !this.mimeAllowed(provider.allowed_mime_types, request.mimeType)) {
      return 'mime_not_allowed'
    }

    const quota = this.providerService.buildQuota(provider)
    if (quota.free_bytes !== null && quota.free_bytes < request.sizeBytes) return 'quota_exceeded'

    return null
  }

  /** Hỗ trợ cả mime đầy đủ ("image/png") và dạng nhóm ("image/*"). */
  private mimeAllowed(allowedList: string, mimeType: string): boolean {
    const allowed = allowedList
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
    if (!allowed.length) return true

    const mime = (mimeType || '').toLowerCase()
    return allowed.some(pattern => {
      if (pattern === '*' || pattern === '*/*') return true
      if (pattern.endsWith('/*')) return mime.startsWith(`${pattern.slice(0, -1)}`)
      return pattern === mime
    })
  }

  /** Diễn giải lý do bị loại sang tiếng người đọc được. */
  private describeRejection(reason: string): string {
    switch (reason) {
      case 'disabled':
        return 'đang tắt nhận upload'
      case 'error':
        return 'đang lỗi kết nối'
      case 'full':
        return 'đã hết dung lượng'
      case 'file_too_large':
        return 'file vượt kích thước cho phép'
      case 'mime_not_allowed':
        return 'không nhận loại file này'
      case 'quota_exceeded':
        return 'không còn đủ dung lượng trống cho file này'
      default:
        return reason
    }
  }

  private errorCodeFor(reason: string): ErrorCode {
    switch (reason) {
      case 'file_too_large':
        return ErrorCode.STORAGE_FILE_TOO_LARGE
      case 'mime_not_allowed':
        return ErrorCode.STORAGE_MIME_NOT_ALLOWED
      case 'quota_exceeded':
      case 'full':
        return ErrorCode.STORAGE_QUOTA_EXCEEDED
      default:
        return ErrorCode.STORAGE_PROVIDER_CONNECTION_FAILED
    }
  }

  private errorMessageFor(reason: string): string {
    switch (reason) {
      case 'file_too_large':
        return 'STORAGE_FILE_TOO_LARGE'
      case 'mime_not_allowed':
        return 'STORAGE_MIME_NOT_ALLOWED'
      case 'quota_exceeded':
      case 'full':
        return 'STORAGE_QUOTA_EXCEEDED'
      default:
        return 'STORAGE_PROVIDER_CONNECTION_FAILED'
    }
  }
}
