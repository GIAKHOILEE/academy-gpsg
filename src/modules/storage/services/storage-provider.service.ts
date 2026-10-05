import { paginate } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { StorageDriver, StorageProviderStatus, StorageStrategy } from '@enums/storage.enum'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import {
  CreateStorageProviderDto,
  PaginateStorageProviderDto,
  TestStorageProviderDto,
  UpdateStorageProviderDto,
  UpdateStorageSettingDto,
} from '../dtos/storage-provider.dto'
import { S3_PRESETS, SECRET_MASK, STORAGE_DRIVER_SCHEMAS, STORAGE_DRIVER_SCHEMA_MAP, STRATEGY_LABELS } from '../storage.constants'
import { COMMON_FIELD_HINTS, STRATEGY_HINTS } from '../storage.guides'
import { StorageCryptoService } from './storage-crypto.service'
import { StorageDriverFactory } from './storage-driver.factory'

/** Thông tin dung lượng đã tính toán xong, dạng số để FE vẽ thanh tiến độ. */
export interface StorageProviderQuota {
  used_bytes: number | null
  /** Dung lượng riêng phần của ta (khác used_bytes với Local và Google Drive). */
  own_bytes: number | null
  /** Hạn mức áp dụng: ưu tiên hạn mức bạn tự đặt, không có thì lấy số dịch vụ báo. */
  total_bytes: number | null
  free_bytes: number | null
  used_percent: number | null
  object_count: number | null
  source: string | null
  checked_at: Date | null
  /** Hạn mức đang lấy từ đâu: manual (bạn đặt) | provider (dịch vụ báo) | none */
  limit_source: 'manual' | 'provider' | 'none'
}

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name)

  constructor(
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
    @InjectRepository(StorageSettingEntity)
    private readonly settingRepository: Repository<StorageSettingEntity>,
    private readonly crypto: StorageCryptoService,
    private readonly driverFactory: StorageDriverFactory,
  ) {}

  /* --------------------------- Đọc dữ liệu --------------------------- */

  async paginateProviders(params: PaginateStorageProviderDto) {
    const queryBuilder = this.providerRepository.createQueryBuilder('provider')
    const result = await paginate(queryBuilder, {
      orderBy: 'priority',
      orderDirection: 'ASC',
      ...params,
    })

    return {
      data: result.data.map(provider => this.toResponse(provider)),
      meta: result.meta,
    }
  }

  /** Danh sách gọn cho dropdown "upload vào đâu". */
  async listProvidersForSelect() {
    const providers = await this.providerRepository.find({ order: { priority: 'ASC', id: 'ASC' } })
    return providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      driver: provider.driver,
      preset: provider.preset,
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      status: provider.status,
      quota: this.buildQuota(provider),
    }))
  }

  async getProviderById(id: number) {
    return this.toResponse(await this.findProviderOrFail(id))
  }

  /** Lấy entity thô (config còn mã hoá). Dùng nội bộ, không trả ra API. */
  async findProviderOrFail(id: number): Promise<StorageProviderEntity> {
    const provider = await this.providerRepository.findOne({ where: { id } })
    if (!provider) {
      throwAppException('STORAGE_PROVIDER_NOT_FOUND', ErrorCode.STORAGE_PROVIDER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return provider
  }

  /* --------------------------- Ghi dữ liệu --------------------------- */

  async createProvider(dto: CreateStorageProviderDto) {
    const config = { ...(dto.config || {}) }
    if (dto.driver === StorageDriver.S3 && dto.preset && !config.preset) config.preset = dto.preset

    this.assertConfigValid(dto.driver, config)

    const provider = this.providerRepository.create({
      name: dto.name,
      driver: dto.driver,
      preset: dto.driver === StorageDriver.S3 ? config.preset || dto.preset : null,
      config_encrypted: this.crypto.encryptJson(config),
      is_enabled: dto.is_enabled ?? true,
      is_default: false, // đặt mặc định đi qua setDefault để đảm bảo chỉ có 1
      is_system: false,
      priority: dto.priority ?? 100,
      weight: dto.weight ?? 1,
      quota_limit_bytes: dto.quota_limit_bytes ?? null,
      max_file_size_bytes: dto.max_file_size_bytes ?? null,
      allowed_mime_types: dto.allowed_mime_types ?? null,
      path_prefix: this.normalizePrefix(dto.path_prefix),
      public_base_url: dto.public_base_url ?? config.public_base_url ?? null,
      status: StorageProviderStatus.UNKNOWN,
    })

    const saved = await this.providerRepository.save(provider)

    // Dịch vụ đầu tiên tự thành mặc định, nếu không sẽ không có chỗ nào nhận upload
    const total = await this.providerRepository.count()
    if (dto.is_default || total === 1) await this.setDefault(saved.id)

    // Test ngay để người dùng thấy trạng thái thật mà không phải bấm thêm
    await this.refreshStatus(saved.id).catch(error => this.logger.warn(`Test dịch vụ mới thất bại: ${error?.message}`))

    return this.getProviderById(saved.id)
  }

  async updateProvider(id: number, dto: UpdateStorageProviderDto) {
    const provider = await this.findProviderOrFail(id)
    const currentConfig = this.crypto.decryptJson(provider.config_encrypted)

    if (dto.config) {
      const merged = this.mergeConfig(provider.driver, currentConfig, dto.config)
      this.assertConfigValid(provider.driver, merged)
      provider.config_encrypted = this.crypto.encryptJson(merged)
      if (provider.driver === StorageDriver.S3) provider.preset = merged.preset || provider.preset
      // Cấu hình đổi thì trạng thái cũ không còn đáng tin
      provider.status = StorageProviderStatus.UNKNOWN
      provider.status_message = null
    }

    if (dto.name !== undefined) provider.name = dto.name
    if (dto.is_enabled !== undefined) provider.is_enabled = dto.is_enabled
    if (dto.priority !== undefined) provider.priority = dto.priority
    if (dto.weight !== undefined) provider.weight = dto.weight
    if (dto.quota_limit_bytes !== undefined) provider.quota_limit_bytes = dto.quota_limit_bytes || null
    if (dto.max_file_size_bytes !== undefined) provider.max_file_size_bytes = dto.max_file_size_bytes || null
    if (dto.allowed_mime_types !== undefined) provider.allowed_mime_types = dto.allowed_mime_types || null
    if (dto.path_prefix !== undefined) provider.path_prefix = this.normalizePrefix(dto.path_prefix)
    if (dto.public_base_url !== undefined) provider.public_base_url = dto.public_base_url || null

    await this.providerRepository.save(provider)
    if (dto.is_default) await this.setDefault(id)

    if (dto.config) {
      await this.refreshStatus(id).catch(error => this.logger.warn(`Test lại dịch vụ thất bại: ${error?.message}`))
    }

    return this.getProviderById(id)
  }

  /**
   * Xoá cấu hình dịch vụ khỏi hệ thống. KHÔNG xoá file trên dịch vụ đó.
   * Chặn lại nếu còn file trong index, vì xoá đi là mất dấu toàn bộ file đó.
   */
  async deleteProvider(id: number) {
    const provider = await this.findProviderOrFail(id)

    const fileCount = await this.fileRepository.count({ where: { provider_id: id } })
    if (fileCount > 0) {
      throwAppException('STORAGE_PROVIDER_HAS_FILES', ErrorCode.STORAGE_PROVIDER_HAS_FILES, HttpStatus.BAD_REQUEST, {
        file_count: fileCount,
      })
    }

    await this.providerRepository.softRemove(provider)

    // Vừa xoá dịch vụ mặc định thì phải chỉ định cái khác, không thì upload sẽ hỏng
    if (provider.is_default) {
      const next = await this.providerRepository.findOne({
        where: { is_enabled: true },
        order: { priority: 'ASC', id: 'ASC' },
      })
      if (next) await this.setDefault(next.id)
    }

    return { id, deleted: true }
  }

  async toggleEnabled(id: number, isEnabled: boolean) {
    const provider = await this.findProviderOrFail(id)
    provider.is_enabled = isEnabled
    await this.providerRepository.save(provider)
    return this.getProviderById(id)
  }

  /** Chỉ có đúng một dịch vụ mặc định tại một thời điểm. */
  async setDefault(id: number) {
    const provider = await this.findProviderOrFail(id)
    await this.providerRepository.update({ is_default: true }, { is_default: false })
    provider.is_default = true
    await this.providerRepository.save(provider)
    return this.getProviderById(id)
  }

  /* --------------------------- Kiểm tra kết nối --------------------------- */

  /**
   * Test cấu hình mà chưa cần lưu. Nếu client gửi secret đang ở dạng che
   * (vì form chỉ hiển thị dấu sao) thì lấy secret thật từ provider_id.
   */
  async testConfig(dto: TestStorageProviderDto) {
    let config = { ...(dto.config || {}) }

    if (dto.provider_id) {
      const provider = await this.findProviderOrFail(dto.provider_id)
      config = this.mergeConfig(dto.driver, this.crypto.decryptJson(provider.config_encrypted), config)
    }

    const errors = this.driverFactory.validateConfig(dto.driver, config)
    if (errors.length) {
      return { ok: false, message: errors.join('. '), details: null }
    }

    try {
      const driver = this.driverFactory.createFromConfig(dto.driver, config, dto.public_base_url)
      return await driver.test()
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Không khởi tạo được dịch vụ lưu trữ', details: null }
    }
  }

  /** Test một dịch vụ đã lưu rồi ghi kết quả vào DB. */
  async refreshStatus(id: number) {
    const provider = await this.findProviderOrFail(id)

    let result: { ok: boolean; message: string; details?: Record<string, any> }
    try {
      result = await this.driverFactory.create(provider).test()
    } catch (error: any) {
      result = { ok: false, message: error?.message || 'Không khởi tạo được dịch vụ lưu trữ' }
    }

    provider.status = result.ok ? StorageProviderStatus.HEALTHY : StorageProviderStatus.ERROR
    provider.status_message = result.message?.slice(0, 1000) || null
    provider.status_checked_at = new Date()
    await this.providerRepository.save(provider)

    return { ...result, provider: this.toResponse(provider) }
  }

  /* --------------------------- Metadata cho UI --------------------------- */

  /**
   * Schema form + preset + hướng dẫn, để FE dựng form động và hiện hướng dẫn
   * mà không phải hardcode gì. Thêm dịch vụ mới ở backend là FE tự có.
   *
   * `drivers[].guide` là hướng dẫn chung của driver; với driver S3 thì hướng dẫn
   * thật nằm ở `s3_presets[].guide` của dịch vụ đang chọn.
   */
  getDriverSchemas() {
    return {
      drivers: STORAGE_DRIVER_SCHEMAS,
      s3_presets: S3_PRESETS,
      secret_mask: SECRET_MASK,
      /** Giải thích các ô không thuộc riêng driver nào (hạn mức, trọng số, tiền tố...) */
      common_fields: COMMON_FIELD_HINTS,
      /** Giải thích từng chiến lược chia tải */
      strategies: Object.values(StorageStrategy).map(value => ({
        value,
        label: STRATEGY_LABELS[value],
        help: STRATEGY_HINTS[value],
      })),
    }
  }

  /* --------------------------- Cấu hình chung --------------------------- */

  async getSettings(): Promise<StorageSettingEntity> {
    const existing = await this.settingRepository.findOne({ where: { id: 1 } })
    if (existing) return existing
    // Tự tạo dòng cấu hình mặc định ở lần đọc đầu tiên
    return this.settingRepository.save(this.settingRepository.create({ id: 1 }))
  }

  async updateSettings(dto: UpdateStorageSettingDto): Promise<StorageSettingEntity> {
    const settings = await this.getSettings()
    Object.assign(settings, dto)
    return this.settingRepository.save(settings)
  }

  /* --------------------------- Helper dùng chung --------------------------- */

  /**
   * Tính dung lượng đã chuẩn hoá. Hạn mức bạn tự đặt luôn thắng số dịch vụ báo,
   * vì đó là thứ bạn muốn hệ thống tôn trọng (ví dụ R2 free 10GB).
   */
  buildQuota(provider: StorageProviderEntity): StorageProviderQuota {
    const used = provider.usage_bytes !== null && provider.usage_bytes !== undefined ? Number(provider.usage_bytes) : null
    const own = provider.usage_own_bytes !== null && provider.usage_own_bytes !== undefined ? Number(provider.usage_own_bytes) : null
    const manualLimit = provider.quota_limit_bytes ? Number(provider.quota_limit_bytes) : null
    const providerLimit = provider.usage_total_bytes ? Number(provider.usage_total_bytes) : null

    const total = manualLimit ?? providerLimit
    const limitSource: StorageProviderQuota['limit_source'] = manualLimit ? 'manual' : providerLimit ? 'provider' : 'none'

    return {
      used_bytes: used,
      own_bytes: own,
      total_bytes: total,
      free_bytes: total !== null && used !== null ? Math.max(total - used, 0) : null,
      used_percent: total && used !== null ? Math.min(Math.round((used / total) * 10000) / 100, 100) : null,
      object_count: provider.usage_objects ? Number(provider.usage_objects) : null,
      source: provider.usage_source || null,
      checked_at: provider.usage_checked_at || null,
      limit_source: limitSource,
    }
  }

  /** Bản ghi provider ở dạng trả ra API: config đã che secret. */
  toResponse(provider: StorageProviderEntity) {
    const schema = STORAGE_DRIVER_SCHEMA_MAP.get(provider.driver)
    const config = this.crypto.decryptJson(provider.config_encrypted)

    return {
      id: provider.id,
      name: provider.name,
      driver: provider.driver,
      driver_label: schema?.label || provider.driver,
      preset: provider.preset,
      preset_label: provider.preset ? S3_PRESETS.find(item => item.id === provider.preset)?.label || provider.preset : null,
      capabilities: schema?.capabilities || null,
      config: this.maskConfig(provider.driver, config),
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      is_system: provider.is_system,
      priority: provider.priority,
      weight: provider.weight,
      quota_limit_bytes: provider.quota_limit_bytes ? Number(provider.quota_limit_bytes) : null,
      max_file_size_bytes: provider.max_file_size_bytes ? Number(provider.max_file_size_bytes) : null,
      allowed_mime_types: provider.allowed_mime_types,
      path_prefix: provider.path_prefix,
      public_base_url: provider.public_base_url,
      status: provider.status,
      status_message: provider.status_message,
      status_checked_at: provider.status_checked_at,
      quota: this.buildQuota(provider),
      created_at: provider.created_at,
      updated_at: provider.updated_at,
    }
  }

  /** Thay mọi field secret bằng dấu che, giữ 4 ký tự cuối để người dùng nhận ra key nào. */
  private maskConfig(driver: StorageDriver, config: Record<string, any>): Record<string, any> {
    const schema = STORAGE_DRIVER_SCHEMA_MAP.get(driver)
    if (!schema) return {}

    const masked: Record<string, any> = {}
    for (const field of schema.fields) {
      const value = config[field.key]
      if (value === undefined || value === null || value === '') continue

      if (field.secret) {
        const text = String(value)
        masked[field.key] = text.length > 4 ? `${SECRET_MASK}${text.slice(-4)}` : SECRET_MASK
        continue
      }
      masked[field.key] = value
    }
    return masked
  }

  /**
   * Trộn config mới vào config cũ. Field secret mà client gửi lại ở dạng che
   * nghĩa là "không đổi", nên phải giữ giá trị cũ thay vì ghi dấu sao vào DB.
   */
  private mergeConfig(driver: StorageDriver, current: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
    const schema = STORAGE_DRIVER_SCHEMA_MAP.get(driver)
    const secretKeys = new Set((schema?.fields || []).filter(field => field.secret).map(field => field.key))

    const merged: Record<string, any> = { ...current }
    for (const [key, value] of Object.entries(incoming)) {
      if (secretKeys.has(key) && typeof value === 'string' && value.startsWith(SECRET_MASK)) continue
      merged[key] = value
    }
    return merged
  }

  private assertConfigValid(driver: StorageDriver, config: Record<string, any>) {
    const errors = this.driverFactory.validateConfig(driver, config)
    if (errors.length) {
      throwAppException('STORAGE_PROVIDER_INVALID_CONFIG', ErrorCode.STORAGE_PROVIDER_INVALID_CONFIG, HttpStatus.BAD_REQUEST, {
        errors: errors.join('; '),
      })
    }
  }

  private normalizePrefix(prefix?: string): string {
    if (!prefix) return null
    const cleaned = prefix.replace(/^\/+|\/+$/g, '').trim()
    return cleaned || null
  }
}
