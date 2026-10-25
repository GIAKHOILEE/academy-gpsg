import { StorageDriver, StorageProviderStatus } from '@enums/storage.enum'
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { HVM_STORAGE_API_KEY_ENV, HVM_STORAGE_DEFAULT_API_KEY, HVM_STORAGE_DEFAULT_URL, HVM_STORAGE_URL_ENV } from '../hvm-storage.defaults'
import { StorageCryptoService } from './storage-crypto.service'
import { StorageUsageService } from './storage-usage.service'

/**
 * Tạo sẵn dịch vụ lưu trữ từ biến môi trường đang có.
 *
 * Trước khi có tính năng này, R2 / Cloudinary / thư mục ổ đĩa được cấu hình cứng
 * bằng env. Seeder đọc đúng những biến đó và dựng thành dịch vụ trong DB, nên sau
 * khi deploy là trang quản lý đã có dữ liệu thật để nhìn, không phải nhập lại key.
 *
 * Chỉ tạo một lần: đã có dịch vụ nào trùng cấu hình thì bỏ qua, và dịch vụ do
 * người dùng sửa sau đó sẽ không bị ghi đè.
 *
 * Riêng hvm-storage được tạo **luôn luôn** (có mặc định trong code) và là dịch vụ
 * mặc định, vì đó là kho file chính của học viện từ nay về sau. Env
 * HVM_STORAGE_URL / HVM_STORAGE_API_KEY có giá trị thì thắng mặc định, và được
 * ghi đè vào dịch vụ đã có mỗi lần khởi động (để xoay key chỉ cần sửa env).
 */
@Injectable()
export class StorageProviderSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageProviderSeeder.name)

  constructor(
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    private readonly crypto: StorageCryptoService,
    private readonly usageService: StorageUsageService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const created: string[] = []

      if (await this.seedR2()) created.push('Cloudflare R2')
      if (await this.seedCloudinary()) created.push('Cloudinary')
      if (await this.seedLocal()) created.push('Ổ đĩa máy chủ')
      // Chạy sau cùng để hạ cờ mặc định của những dịch vụ vừa tạo ở trên
      if (await this.seedHvm()) created.push('HVM Storage')

      if (!created.length) return

      this.logger.log(`Đã tạo dịch vụ lưu trữ từ biến môi trường: ${created.join(', ')}`)

      // Lấy dung lượng ngay để trang quản lý có số liệu thật từ lần mở đầu tiên
      await this.usageService.refreshAllUsage()
    } catch (error: any) {
      // Seeder lỗi không được chặn app khởi động
      this.logger.error(`Không tạo được dịch vụ lưu trữ từ biến môi trường: ${error?.message}`)
    }
  }

  /* ------------------------------ private ------------------------------ */

  private async seedR2(): Promise<boolean> {
    const endpoint = process.env.R2_ENDPOINT
    const bucket = process.env.R2_BUCKET_NAME
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return false
    if (await this.exists(StorageDriver.S3, 'cloudflare_r2', bucket)) return false

    // Account ID nằm ngay trong endpoint: https://<account_id>.r2.cloudflarestorage.com
    const accountId = endpoint.match(/https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/i)?.[1] || null

    await this.providerRepository.save(
      this.providerRepository.create({
        name: 'Cloudflare R2 (từ biến môi trường)',
        driver: StorageDriver.S3,
        preset: 'cloudflare_r2',
        config_encrypted: this.crypto.encryptJson({
          preset: 'cloudflare_r2',
          bucket,
          region: 'auto',
          endpoint,
          account_id: accountId,
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
          cf_api_token: process.env.R2_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || null,
        }),
        public_base_url: process.env.R2_PUBLIC_URL || null,
        is_enabled: true,
        is_default: true,
        is_system: true,
        priority: 10,
        weight: 1,
        status: StorageProviderStatus.UNKNOWN,
      }),
    )
    return true
  }

  private async seedCloudinary(): Promise<boolean> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) return false
    if (await this.exists(StorageDriver.CLOUDINARY, null, cloudName)) return false

    await this.providerRepository.save(
      this.providerRepository.create({
        name: 'Cloudinary (từ biến môi trường)',
        driver: StorageDriver.CLOUDINARY,
        config_encrypted: this.crypto.encryptJson({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          folder: process.env.CLOUDINARY_FOLDER || null,
        }),
        is_enabled: true,
        is_default: false,
        is_system: true,
        priority: 20,
        weight: 1,
        status: StorageProviderStatus.UNKNOWN,
      }),
    )
    return true
  }

  private async seedLocal(): Promise<boolean> {
    const rootPath = process.env.STORAGE_PATH
    if (!rootPath) return false
    if (await this.exists(StorageDriver.LOCAL, null, rootPath)) return false

    await this.providerRepository.save(
      this.providerRepository.create({
        name: 'Ổ đĩa máy chủ (từ biến môi trường)',
        driver: StorageDriver.LOCAL,
        config_encrypted: this.crypto.encryptJson({
          root_path: rootPath,
          public_base_url: process.env.FILE_DOMAIN || null,
        }),
        public_base_url: process.env.FILE_DOMAIN || null,
        // Ổ đĩa máy chủ đang gần đầy nên để sẵn ở chế độ chỉ đọc: file cũ vẫn
        // lấy ra được, nhưng không nhận thêm file mới. Bật lại bất cứ lúc nào trên UI.
        is_enabled: false,
        is_default: false,
        is_system: true,
        priority: 90,
        weight: 1,
        status: StorageProviderStatus.UNKNOWN,
      }),
    )
    return true
  }

  /**
   * hvm-storage: tạo mặc định với priority cao nhất và là dịch vụ mặc định.
   *
   * - Chưa có dòng nào driver `hvm` => tạo mới từ env (nếu có) hoặc giá trị mặc định trong
   *   code, hạ `is_default` của mọi dịch vụ khác.
   * - Đã có => KHÔNG đụng gì. URL/API key là cấu hình động: sửa tại trang quản trị
   *   "Quản lý lưu trữ" (lưu mã hoá trong DB, có hiệu lực ngay). Env chỉ là giá trị khởi
   *   tạo lần đầu — trước đây env ghi đè DB mỗi lần restart, làm key vừa xoay trên giao
   *   diện bị trả về giá trị cũ.
   */
  private async seedHvm(): Promise<boolean> {
    const envUrl = process.env[HVM_STORAGE_URL_ENV]
    const envKey = process.env[HVM_STORAGE_API_KEY_ENV]
    const baseUrl = String(envUrl || HVM_STORAGE_DEFAULT_URL).replace(/\/+$/, '')
    const apiKey = String(envKey || HVM_STORAGE_DEFAULT_API_KEY)

    const existing = (await this.providerRepository.find({ where: { driver: StorageDriver.HVM }, withDeleted: true })).filter(
      provider => provider.driver === StorageDriver.HVM,
    )
    if (existing.length) return false

    // Chỉ được có một dịch vụ mặc định
    await this.providerRepository.update({ is_default: true }, { is_default: false })

    await this.providerRepository.save(
      this.providerRepository.create({
        name: envUrl || envKey ? 'HVM Storage (từ biến môi trường)' : 'HVM Storage (mặc định)',
        driver: StorageDriver.HVM,
        config_encrypted: this.crypto.encryptJson({
          base_url: baseUrl,
          api_key: apiKey,
          folder_path: process.env.HVM_STORAGE_FOLDER || null,
          default_visibility: process.env.HVM_STORAGE_DEFAULT_VISIBILITY || null,
        }),
        public_base_url: baseUrl,
        is_enabled: true,
        is_default: true,
        is_system: true,
        priority: 5,
        weight: 1,
        status: StorageProviderStatus.UNKNOWN,
      }),
    )
    return true
  }

  /**
   * Đã có dịch vụ cùng loại và cùng đích chưa.
   * So theo nội dung config chứ không theo tên, vì người dùng có thể đổi tên.
   */
  private async exists(driver: StorageDriver, preset: string | null, identifier: string): Promise<boolean> {
    const candidates = await this.providerRepository.find({
      where: preset ? { driver, preset } : { driver },
      withDeleted: true,
    })

    return candidates.some(provider => {
      const config = this.crypto.decryptJson(provider.config_encrypted)
      const target = config.bucket || config.cloud_name || config.root_path || config.container || config.storage_zone
      return target === identifier
    })
  }
}
