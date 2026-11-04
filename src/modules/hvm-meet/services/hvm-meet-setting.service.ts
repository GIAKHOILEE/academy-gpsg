import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HvmMeetStatus } from '@enums/meeting.enum'
import { StorageCryptoService } from '@modules/storage/services/storage-crypto.service'
import { SECRET_MASK } from '@modules/storage/storage.constants'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TestHvmMeetSettingDto, UpdateHvmMeetSettingDto } from '../dtos/hvm-meet-setting.dto'
import { HvmMeetSettingEntity } from '../entities/hvm-meet-setting.entity'
import { HVM_MEET_DEFAULT_TEMPLATE_KEY, HVM_MEET_WEBHOOK_PATH } from '../hvm-meet.constants'
import { DEFAULT_ROOM_POLICY, HvmMeetRoomPolicy, normalizeRoomPolicy } from '../hvm-meet.policy'
import { HvmMeetConnectionConfig } from '../hvm-meet.types'
import { UpdateHvmMeetRoomPolicyDto } from '../dtos/hvm-meet-room-policy.dto'
import { HvmMeetClientService } from './hvm-meet-client.service'

/** Phần cấu hình nằm trong `config_encrypted`. */
interface HvmMeetSecretConfig {
  base_url?: string | null
  api_key?: string | null
  webhook_secret?: string | null
}

const SECRET_KEYS: (keyof HvmMeetSecretConfig)[] = ['api_key', 'webhook_secret']

export const HVM_MEET_SETTING_ID = 1

export interface HvmMeetTestResult {
  ok: boolean
  message: string
  details?: { app: { id: string; slug: string; name: string }; allowedOrigins: string[] } | null
}

/**
 * Cấu hình động của tích hợp HVM Meet (1 dòng trong `hvm_meet_settings`).
 * Đọc / ghi / che secret / kiểm tra kết nối, theo đúng cách StorageProviderService làm với dịch vụ lưu trữ.
 */
@Injectable()
export class HvmMeetSettingService {
  private readonly logger = new Logger(HvmMeetSettingService.name)

  constructor(
    @InjectRepository(HvmMeetSettingEntity)
    private readonly settingRepository: Repository<HvmMeetSettingEntity>,
    private readonly crypto: StorageCryptoService,
    private readonly client: HvmMeetClientService,
  ) {}

  /* --------------------------- Đọc dữ liệu --------------------------- */

  async getSettings(): Promise<HvmMeetSettingEntity> {
    const existing = await this.settingRepository.findOne({ where: { id: HVM_MEET_SETTING_ID } })
    if (existing) return existing
    // Tự tạo dòng cấu hình mặc định (đang tắt) ở lần đọc đầu tiên
    return this.settingRepository.save(
      this.settingRepository.create({ id: HVM_MEET_SETTING_ID, is_enabled: false, default_template_key: HVM_MEET_DEFAULT_TEMPLATE_KEY }),
    )
  }

  async getConfigResponse() {
    return this.toResponse(await this.getSettings())
  }

  /**
   * Cấu hình đang dùng để cấp vé vào phòng. null = tích hợp đang tắt hoặc thiếu URL/API key.
   */
  async getActiveConfig(): Promise<HvmMeetConnectionConfig | null> {
    const settings = await this.getSettings()
    if (!settings.is_enabled) return null

    const config = this.readConfig(settings)
    if (!config.base_url || !config.api_key) return null

    return {
      base_url: config.base_url,
      api_key: config.api_key,
      webhook_secret: config.webhook_secret || null,
      default_template_key: settings.default_template_key || HVM_MEET_DEFAULT_TEMPLATE_KEY,
    }
  }

  /** Secret ký webhook. Không phụ thuộc cờ bật/tắt: điểm danh, bản ghi của buổi đã học vẫn phải về được. */
  async getWebhookSecret(): Promise<string | null> {
    const settings = await this.settingRepository.findOne({ where: { id: HVM_MEET_SETTING_ID } })
    if (!settings) return null
    return this.readConfig(settings).webhook_secret || null
  }

  /* --------------------------- Ghi dữ liệu --------------------------- */

  async updateConfig(dto: UpdateHvmMeetSettingDto) {
    const settings = await this.getSettings()
    const current = this.readConfig(settings)
    const merged = this.mergeConfig(current, dto)
    this.assertBaseUrlValid(merged.base_url)

    const connectionChanged = merged.base_url !== current.base_url || merged.api_key !== current.api_key
    settings.config_encrypted = this.crypto.encryptJson(merged)
    if (dto.is_enabled !== undefined) settings.is_enabled = dto.is_enabled
    if (dto.default_template_key !== undefined) settings.default_template_key = dto.default_template_key || HVM_MEET_DEFAULT_TEMPLATE_KEY

    if (connectionChanged) {
      // Cấu hình kết nối đổi thì trạng thái cũ không còn đáng tin
      settings.status = HvmMeetStatus.UNKNOWN
      settings.status_message = null
      settings.status_checked_at = null
    }
    await this.settingRepository.save(settings)

    // Test ngay để người quản trị thấy trạng thái thật mà không phải bấm thêm
    if (connectionChanged && merged.base_url && merged.api_key) {
      await this.testConfig({}).catch(error => this.logger.warn(`Kiểm tra kết nối HVM Meet thất bại: ${error?.message}`))
    }

    return this.getConfigResponse()
  }

  /* ------------------ Cách vào phòng + điểm danh (mặc định chung) ------------------ */

  /** Mặc định chung đã lưu; null = chưa lưu lần nào (meet dùng giá trị kế thừa). */
  async getStoredRoomPolicy(): Promise<HvmMeetRoomPolicy | null> {
    const settings = await this.getSettings()
    return normalizeRoomPolicy(settings.room_policy)
  }

  /** GET /admin/hvm-meet/room-policy: giá trị đã lưu + mặc định để FE hiển thị khi chưa lưu. */
  async getRoomPolicy(): Promise<{ policy: HvmMeetRoomPolicy | null; defaults: HvmMeetRoomPolicy }> {
    return { policy: await this.getStoredRoomPolicy(), defaults: DEFAULT_ROOM_POLICY }
  }

  /**
   * PUT /admin/hvm-meet/room-policy. `policy: null` = khôi phục mặc định.
   * Đẩy sang các phòng sắp tới do controller gọi LessonMeetingService.resyncUpcomingRooms().
   */
  async updateRoomPolicy(dto: UpdateHvmMeetRoomPolicyDto): Promise<{ policy: HvmMeetRoomPolicy | null; defaults: HvmMeetRoomPolicy }> {
    const settings = await this.getSettings()
    settings.room_policy = dto?.policy ? normalizeRoomPolicy(dto.policy) : null
    await this.settingRepository.save(settings)
    return this.getRoomPolicy()
  }

  /* --------------------------- Kiểm tra kết nối --------------------------- */

  /**
   * Gọi GET /v1/integration/me với cấu hình trên form (trường còn che / bỏ trống thì lấy giá trị đã lưu).
   * Chỉ ghi trạng thái vào DB khi đang kiểm tra đúng cấu hình đã lưu.
   */
  async testConfig(dto: TestHvmMeetSettingDto): Promise<HvmMeetTestResult> {
    const settings = await this.getSettings()
    const stored = this.readConfig(settings)
    const config = this.mergeConfig(stored, dto)
    const isStoredConfig = config.base_url === stored.base_url && config.api_key === stored.api_key

    let result: HvmMeetTestResult
    if (!config.base_url) {
      result = { ok: false, message: 'Chưa nhập URL của HVM Meet.', details: null }
    } else if (!this.isHttpUrl(config.base_url)) {
      result = { ok: false, message: 'URL HVM Meet phải bắt đầu bằng http:// hoặc https://', details: null }
    } else if (!config.api_key) {
      result = { ok: false, message: 'Chưa nhập API key của HVM Meet.', details: null }
    } else {
      try {
        const me = await this.client.me({ baseUrl: config.base_url, apiKey: config.api_key })
        result = {
          ok: true,
          message: `Kết nối thành công với ứng dụng "${me?.name || me?.slug}" trên HVM Meet`,
          details: { app: { id: me?.id, slug: me?.slug, name: me?.name }, allowedOrigins: me?.allowedOrigins || [] },
        }
      } catch (error: any) {
        result = { ok: false, message: this.client.describeError(error), details: null }
      }
    }

    if (isStoredConfig) {
      settings.status = result.ok ? HvmMeetStatus.HEALTHY : HvmMeetStatus.ERROR
      settings.status_message = result.message?.slice(0, 1000) || null
      settings.status_checked_at = new Date()
      await this.settingRepository.save(settings)
    }

    return result
  }

  /* --------------------------- Helper dùng chung --------------------------- */

  /** Bản ghi cấu hình ở dạng trả ra API: secret đã che. */
  toResponse(settings: HvmMeetSettingEntity) {
    const config = this.readConfig(settings)
    return {
      base_url: config.base_url || null,
      api_key: this.mask(config.api_key),
      webhook_secret: this.mask(config.webhook_secret),
      has_api_key: Boolean(config.api_key),
      has_webhook_secret: Boolean(config.webhook_secret),
      is_enabled: settings.is_enabled,
      default_template_key: settings.default_template_key || HVM_MEET_DEFAULT_TEMPLATE_KEY,
      webhook_path: HVM_MEET_WEBHOOK_PATH,
      secret_mask: SECRET_MASK,
      status: settings.status || HvmMeetStatus.UNKNOWN,
      status_message: settings.status_message || null,
      status_checked_at: settings.status_checked_at || null,
      updated_at: settings.updated_at || null,
    }
  }

  private readConfig(settings: HvmMeetSettingEntity): HvmMeetSecretConfig {
    return this.crypto.decryptJson(settings?.config_encrypted) as HvmMeetSecretConfig
  }

  /**
   * Trộn giá trị trên form vào cấu hình đã lưu. Secret gửi lại ở dạng che nghĩa là "không đổi",
   * nên giữ giá trị cũ thay vì ghi dấu sao vào DB; chuỗi rỗng nghĩa là xoá.
   */
  private mergeConfig(current: HvmMeetSecretConfig, incoming: UpdateHvmMeetSettingDto): HvmMeetSecretConfig {
    const merged: HvmMeetSecretConfig = { ...current }

    if (incoming.base_url !== undefined) {
      merged.base_url =
        String(incoming.base_url || '')
          .trim()
          .replace(/\/+$/, '') || null
    }
    for (const key of SECRET_KEYS) {
      const value = incoming[key]
      if (value === undefined || value === null) continue
      if (typeof value === 'string' && value.startsWith(SECRET_MASK)) continue
      merged[key] = String(value).trim() || null
    }
    return merged
  }

  private assertBaseUrlValid(baseUrl: string | null | undefined) {
    if (baseUrl && !this.isHttpUrl(baseUrl)) {
      throwAppException('HVM_MEET_INVALID_CONFIG', ErrorCode.HVM_MEET_INVALID_CONFIG, HttpStatus.BAD_REQUEST, {
        field: 'base_url',
      })
    }
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  /** Che secret, giữ 4 ký tự cuối để người dùng nhận ra key nào. */
  private mask(value: string | null | undefined): string | null {
    if (!value) return null
    const text = String(value)
    return text.length > 4 ? `${SECRET_MASK}${text.slice(-4)}` : SECRET_MASK
  }
}
