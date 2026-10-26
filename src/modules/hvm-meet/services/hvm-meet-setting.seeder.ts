import { HvmMeetStatus } from '@enums/meeting.enum'
import { StorageCryptoService } from '@modules/storage/services/storage-crypto.service'
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HvmMeetSettingEntity } from '../entities/hvm-meet-setting.entity'
import { HVM_MEET_API_KEY_ENV, HVM_MEET_DEFAULT_TEMPLATE_KEY, HVM_MEET_URL_ENV, HVM_MEET_WEBHOOK_SECRET_ENV } from '../hvm-meet.constants'
import { HVM_MEET_SETTING_ID } from './hvm-meet-setting.service'

/**
 * Tạo dòng cấu hình HVM Meet lần đầu từ env HVM_MEET_URL / HVM_MEET_API_KEY / HVM_MEET_WEBHOOK_SECRET.
 *
 * Chỉ chạy khi bảng còn trống. Đã có dòng thì KHÔNG đụng gì: URL/key/secret là cấu hình động,
 * sửa ở trang quản trị là có hiệu lực ngay; env không được ghi đè lên đó mỗi lần restart
 * (đúng bài học của seeder hvm-storage).
 */
@Injectable()
export class HvmMeetSettingSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(HvmMeetSettingSeeder.name)

  constructor(
    @InjectRepository(HvmMeetSettingEntity)
    private readonly settingRepository: Repository<HvmMeetSettingEntity>,
    private readonly crypto: StorageCryptoService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seed()
    } catch (error: any) {
      // Seeder lỗi không được chặn app khởi động
      this.logger.error(`Không khởi tạo được cấu hình HVM Meet từ biến môi trường: ${error?.message}`)
    }
  }

  /** true nếu vừa tạo dòng cấu hình. */
  async seed(): Promise<boolean> {
    if ((await this.settingRepository.count()) > 0) return false

    const baseUrl = String(process.env[HVM_MEET_URL_ENV] || '')
      .trim()
      .replace(/\/+$/, '')
    const apiKey = String(process.env[HVM_MEET_API_KEY_ENV] || '').trim()
    const webhookSecret = String(process.env[HVM_MEET_WEBHOOK_SECRET_ENV] || '').trim()

    await this.settingRepository.save(
      this.settingRepository.create({
        id: HVM_MEET_SETTING_ID,
        config_encrypted: this.crypto.encryptJson({
          base_url: baseUrl || null,
          api_key: apiKey || null,
          webhook_secret: webhookSecret || null,
        }),
        // Đủ URL + key thì bật luôn; thiếu thì để tắt, bật trên trang quản trị sau khi điền
        is_enabled: Boolean(baseUrl && apiKey),
        default_template_key: HVM_MEET_DEFAULT_TEMPLATE_KEY,
        status: HvmMeetStatus.UNKNOWN,
      }),
    )

    if (baseUrl || apiKey || webhookSecret) this.logger.log('Đã tạo cấu hình HVM Meet từ biến môi trường')
    return true
  }
}
