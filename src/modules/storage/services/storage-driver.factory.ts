import { StorageDriver } from '@enums/storage.enum'
import { BadRequestException, Injectable } from '@nestjs/common'
import { AzureBlobStorageDriver } from '../drivers/azure-blob.driver'
import { BunnyStorageDriver } from '../drivers/bunny.driver'
import { CloudinaryStorageDriver } from '../drivers/cloudinary.driver'
import { DropboxStorageDriver } from '../drivers/dropbox.driver'
import { GoogleDriveStorageDriver } from '../drivers/google-drive.driver'
import { LocalStorageDriver } from '../drivers/local.driver'
import { OneDriveStorageDriver } from '../drivers/onedrive.driver'
import { S3StorageDriver } from '../drivers/s3.driver'
import { IStorageDriver } from '../drivers/storage-driver.interface'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { STORAGE_DRIVER_SCHEMA_MAP } from '../storage.constants'
import { StorageCryptoService } from './storage-crypto.service'

/**
 * Dựng instance driver từ một bản ghi provider trong DB.
 *
 * Thêm dịch vụ mới = thêm 1 file driver + 1 nhánh ở đây + 1 schema trong
 * storage.constants.ts. Không chỗ nào khác trong hệ thống phải biết tới nó.
 */
@Injectable()
export class StorageDriverFactory {
  constructor(private readonly crypto: StorageCryptoService) {}

  /** Tạo driver từ provider đã lưu (config trong DB đang ở dạng mã hoá). */
  create(provider: StorageProviderEntity): IStorageDriver {
    return this.createFromConfig(provider.driver, this.crypto.decryptJson(provider.config_encrypted), provider.public_base_url)
  }

  /** Tạo driver từ config thô - dùng khi test kết nối trước lúc lưu vào DB. */
  createFromConfig(driver: StorageDriver, config: Record<string, any>, publicBaseUrl?: string): IStorageDriver {
    switch (driver) {
      case StorageDriver.S3:
        return new S3StorageDriver(config, publicBaseUrl)
      case StorageDriver.LOCAL:
        return new LocalStorageDriver(config, publicBaseUrl)
      case StorageDriver.CLOUDINARY:
        return new CloudinaryStorageDriver(config)
      case StorageDriver.GOOGLE_DRIVE:
        return new GoogleDriveStorageDriver(config)
      case StorageDriver.DROPBOX:
        return new DropboxStorageDriver(config)
      case StorageDriver.ONEDRIVE:
        return new OneDriveStorageDriver(config)
      case StorageDriver.AZURE_BLOB:
        return new AzureBlobStorageDriver(config, publicBaseUrl)
      case StorageDriver.BUNNY:
        return new BunnyStorageDriver(config, publicBaseUrl)
      default:
        throw new BadRequestException(`Chưa hỗ trợ loại dịch vụ lưu trữ "${driver}"`)
    }
  }

  /** Kiểm tra config có đủ các field bắt buộc theo schema của driver. */
  validateConfig(driver: StorageDriver, config: Record<string, any>): string[] {
    const schema = STORAGE_DRIVER_SCHEMA_MAP.get(driver)
    if (!schema) return [`Không có schema cho loại dịch vụ "${driver}"`]

    const errors: string[] = []
    for (const field of schema.fields) {
      // Field chỉ bắt buộc khi điều kiện showIf được thoả
      if (field.showIf && !field.showIf.in.includes(String(config[field.showIf.key]))) continue
      if (!field.required) continue

      const value = config[field.key]
      if (value === undefined || value === null || value === '') {
        errors.push(`Thiếu "${field.label}"`)
      }
    }

    // Preset S3 không có mẫu endpoint thì người dùng buộc phải tự nhập
    if (driver === StorageDriver.S3) {
      const preset = config.preset
      const needsManualEndpoint = ['minio', 'custom', 'idrive_e2'].includes(preset)
      if (needsManualEndpoint && !config.endpoint) {
        errors.push('Dịch vụ này cần bạn nhập Endpoint')
      }
    }

    return errors
  }
}
