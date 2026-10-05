import { GoogleDriveAuthMode, StorageDriver } from '@enums/storage.enum'
import { AzureBlobStorageDriver } from '../drivers/azure-blob.driver'
import { BunnyStorageDriver } from '../drivers/bunny.driver'
import { CloudinaryStorageDriver } from '../drivers/cloudinary.driver'
import { DropboxStorageDriver } from '../drivers/dropbox.driver'
import { GoogleDriveStorageDriver } from '../drivers/google-drive.driver'
import { LocalStorageDriver } from '../drivers/local.driver'
import { OneDriveStorageDriver } from '../drivers/onedrive.driver'
import { S3StorageDriver } from '../drivers/s3.driver'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageCryptoService } from '../services/storage-crypto.service'
import { StorageDriverFactory } from '../services/storage-driver.factory'

describe('StorageDriverFactory', () => {
  let factory: StorageDriverFactory
  let crypto: StorageCryptoService

  beforeEach(() => {
    process.env.STORAGE_ENCRYPTION_KEY = 'khoa-test'
    crypto = new StorageCryptoService()
    factory = new StorageDriverFactory(crypto)
  })

  describe('createFromConfig', () => {
    it('dựng đúng class driver cho từng loại dịch vụ', () => {
      const cases: [StorageDriver, Record<string, any>, unknown][] = [
        [StorageDriver.S3, { preset: 'cloudflare_r2', bucket: 'b', account_id: 'a', access_key_id: 'k', secret_access_key: 's' }, S3StorageDriver],
        [StorageDriver.LOCAL, { root_path: '/tmp/x' }, LocalStorageDriver],
        [StorageDriver.CLOUDINARY, { cloud_name: 'c', api_key: 'k', api_secret: 's' }, CloudinaryStorageDriver],
        [StorageDriver.GOOGLE_DRIVE, { auth_mode: GoogleDriveAuthMode.OAUTH }, GoogleDriveStorageDriver],
        [StorageDriver.DROPBOX, { app_key: 'k', app_secret: 's', refresh_token: 'r' }, DropboxStorageDriver],
        [StorageDriver.ONEDRIVE, { tenant_id: 'common', client_id: 'c', client_secret: 's' }, OneDriveStorageDriver],
        [StorageDriver.AZURE_BLOB, { account_name: 'a', container: 'c', sas_token: 't' }, AzureBlobStorageDriver],
        [StorageDriver.BUNNY, { storage_zone: 'z', access_key: 'k' }, BunnyStorageDriver],
      ]

      for (const [driver, config, expected] of cases) {
        expect(factory.createFromConfig(driver, config)).toBeInstanceOf(expected as never)
      }
    })

    it('báo lỗi rõ ràng với loại dịch vụ chưa hỗ trợ', () => {
      expect(() => factory.createFromConfig('dropbox-v9' as StorageDriver, {})).toThrow(/Chưa hỗ trợ/)
    })

    it('mọi driver đều khai báo đủ capabilities', () => {
      const driver = factory.createFromConfig(StorageDriver.LOCAL, { root_path: '/tmp/x' })

      expect(driver.capabilities).toEqual(
        expect.objectContaining({
          quotaApi: expect.any(Boolean),
          listing: expect.any(Boolean),
          signedUrl: expect.any(Boolean),
          publicUrl: expect.any(Boolean),
          realFolders: expect.any(Boolean),
          move: expect.any(Boolean),
        }),
      )
    })
  })

  describe('create (từ provider đã lưu trong DB)', () => {
    it('giải mã config rồi dựng driver, và truyền public_base_url vào', () => {
      const provider = Object.assign(new StorageProviderEntity(), {
        driver: StorageDriver.S3,
        preset: 'cloudflare_r2',
        public_base_url: 'https://pub-test.r2.dev',
        config_encrypted: crypto.encryptJson({
          preset: 'cloudflare_r2',
          bucket: 'hvm',
          account_id: 'acc',
          access_key_id: 'key',
          secret_access_key: 'secret',
        }),
      })

      const driver = factory.create(provider)

      expect(driver).toBeInstanceOf(S3StorageDriver)
      expect(driver.getPublicUrl('anh.png')).toBe('https://pub-test.r2.dev/anh.png')
    })
  })

  describe('validateConfig', () => {
    it('không báo lỗi khi config đủ field bắt buộc', () => {
      expect(
        factory.validateConfig(StorageDriver.S3, {
          preset: 'cloudflare_r2',
          bucket: 'hvm',
          access_key_id: 'key',
          secret_access_key: 'secret',
          account_id: 'acc',
        }),
      ).toEqual([])
    })

    it('liệt kê đúng những field bắt buộc còn thiếu', () => {
      const errors = factory.validateConfig(StorageDriver.S3, { preset: 'aws_s3' })

      expect(errors).toContain('Thiếu "Bucket"')
      expect(errors).toContain('Thiếu "Access Key ID"')
      expect(errors).toContain('Thiếu "Secret Access Key"')
    })

    it('coi chuỗi rỗng là thiếu, không phải là đã nhập', () => {
      const errors = factory.validateConfig(StorageDriver.LOCAL, { root_path: '', public_base_url: '   ' })

      expect(errors).toContain('Thiếu "Đường dẫn thư mục"')
    })

    it('chỉ bắt buộc field của preset đang chọn, không bắt field của preset khác', () => {
      // account_id là field riêng của R2, chọn AWS thì không được đòi
      const awsErrors = factory.validateConfig(StorageDriver.S3, {
        preset: 'aws_s3',
        bucket: 'b',
        region: 'ap-southeast-1',
        access_key_id: 'k',
        secret_access_key: 's',
      })
      expect(awsErrors).toEqual([])

      // Nhưng chọn R2 thì phải có account_id
      const r2Errors = factory.validateConfig(StorageDriver.S3, {
        preset: 'cloudflare_r2',
        bucket: 'b',
        access_key_id: 'k',
        secret_access_key: 's',
      })
      expect(r2Errors).toContain('Thiếu "Account ID"')
    })

    it('bắt buộc nhập endpoint với các dịch vụ không có mẫu endpoint', () => {
      for (const preset of ['minio', 'custom', 'idrive_e2']) {
        const errors = factory.validateConfig(StorageDriver.S3, {
          preset,
          bucket: 'b',
          access_key_id: 'k',
          secret_access_key: 's',
        })
        expect(errors).toContain('Dịch vụ này cần bạn nhập Endpoint')
      }
    })

    it('không đòi endpoint khi đã nhập', () => {
      const errors = factory.validateConfig(StorageDriver.S3, {
        preset: 'minio',
        bucket: 'b',
        endpoint: 'https://minio.example.com:9000',
        access_key_id: 'k',
        secret_access_key: 's',
      })

      expect(errors).toEqual([])
    })

    it('Google Drive mode OAuth đòi client id/secret/refresh token, không đòi service account json', () => {
      const errors = factory.validateConfig(StorageDriver.GOOGLE_DRIVE, { auth_mode: GoogleDriveAuthMode.OAUTH })

      expect(errors).toContain('Thiếu "OAuth Client ID"')
      expect(errors).toContain('Thiếu "OAuth Client Secret"')
      expect(errors).toContain('Thiếu "Refresh token"')
      expect(errors).not.toContain('Thiếu "Service account JSON"')
    })

    it('Google Drive mode service account đòi JSON, không đòi client id/secret', () => {
      const errors = factory.validateConfig(StorageDriver.GOOGLE_DRIVE, {
        auth_mode: GoogleDriveAuthMode.SERVICE_ACCOUNT,
      })

      expect(errors).toContain('Thiếu "Service account JSON"')
      expect(errors).not.toContain('Thiếu "OAuth Client ID"')
      expect(errors).not.toContain('Thiếu "Refresh token"')
    })

    it('OneDrive không đòi refresh token vì chế độ app-only không dùng tới', () => {
      const errors = factory.validateConfig(StorageDriver.ONEDRIVE, {
        tenant_id: 'common',
        client_id: 'c',
        client_secret: 's',
      })

      expect(errors).toEqual([])
    })

    it('báo lỗi khi loại dịch vụ không có schema', () => {
      expect(factory.validateConfig('khong-ton-tai' as StorageDriver, {})).toEqual(['Không có schema cho loại dịch vụ "khong-ton-tai"'])
    })
  })
})
