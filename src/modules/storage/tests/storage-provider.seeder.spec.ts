import { StorageDriver } from '@enums/storage.enum'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { HVM_STORAGE_DEFAULT_API_KEY, HVM_STORAGE_DEFAULT_URL } from '../hvm-storage.defaults'
import { StorageCryptoService } from '../services/storage-crypto.service'
import { StorageProviderSeeder } from '../services/storage-provider.seeder'

describe('StorageProviderSeeder', () => {
  const originalEnv = { ...process.env }
  let seeder: StorageProviderSeeder
  let crypto: StorageCryptoService
  let providerRepository: any
  let usageService: any
  let saved: StorageProviderEntity[]

  beforeEach(() => {
    process.env = { ...originalEnv, STORAGE_ENCRYPTION_KEY: 'khoa-test' }
    // Xoá sạch biến môi trường liên quan, từng test tự bật cái nó cần
    for (const key of [
      'R2_ENDPOINT',
      'R2_BUCKET_NAME',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_PUBLIC_URL',
      'R2_API_TOKEN',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'CLOUDINARY_FOLDER',
      'STORAGE_PATH',
      'FILE_DOMAIN',
      'HVM_STORAGE_URL',
      'HVM_STORAGE_API_KEY',
    ]) {
      delete process.env[key]
    }

    saved = []
    crypto = new StorageCryptoService()
    providerRepository = {
      find: jest.fn(async () => []),
      create: jest.fn((value: any) => Object.assign(new StorageProviderEntity(), value)),
      save: jest.fn(async (value: any) => {
        if (!saved.includes(value)) saved.push(value)
        return value
      }),
      // Mô phỏng UPDATE ... WHERE is_default = true trên những gì đã lưu
      update: jest.fn(async (where: any, set: any) => {
        for (const item of saved) if (item.is_default === where.is_default) Object.assign(item, set)
      }),
    }
    usageService = { refreshAllUsage: jest.fn(async () => []) }

    seeder = new StorageProviderSeeder(providerRepository, crypto, usageService)
    jest.spyOn(seeder['logger'], 'log').mockImplementation(() => undefined)
    jest.spyOn(seeder['logger'], 'error').mockImplementation(() => undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  /** Dịch vụ sinh từ env thật, bỏ dòng HVM luôn được tạo mặc định. */
  const savedFromEnv = () => saved.filter(item => item.driver !== StorageDriver.HVM)

  const withR2 = () => {
    process.env.R2_ENDPOINT = 'https://abc123def456.r2.cloudflarestorage.com'
    process.env.R2_BUCKET_NAME = 'hvm'
    process.env.R2_ACCESS_KEY_ID = 'r2-key'
    process.env.R2_SECRET_ACCESS_KEY = 'r2-secret'
    process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev'
  }

  const withCloudinary = () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'dai7fok3c'
    process.env.CLOUDINARY_API_KEY = 'cl-key'
    process.env.CLOUDINARY_API_SECRET = 'cl-secret'
    process.env.CLOUDINARY_FOLDER = 'hvm'
  }

  describe('R2 từ biến môi trường', () => {
    it('tạo dịch vụ R2 với cấu hình đã mã hoá', async () => {
      withR2()

      await seeder.onApplicationBootstrap()

      expect(savedFromEnv()).toHaveLength(1)
      expect(saved[0]).toMatchObject({
        driver: StorageDriver.S3,
        preset: 'cloudflare_r2',
        is_enabled: true,
        // HVM Storage được tạo sau và giành cờ mặc định
        is_default: false,
        is_system: true,
        public_base_url: 'https://pub-test.r2.dev',
      })

      const config = crypto.decryptJson(saved[0].config_encrypted)
      expect(config).toMatchObject({
        preset: 'cloudflare_r2',
        bucket: 'hvm',
        region: 'auto',
        access_key_id: 'r2-key',
        secret_access_key: 'r2-secret',
      })
      // Secret không được nằm dạng rõ trong DB
      expect(saved[0].config_encrypted).not.toContain('r2-secret')
    })

    it('tự tách account id ra từ endpoint, khỏi phải nhập tay', async () => {
      withR2()

      await seeder.onApplicationBootstrap()

      expect(crypto.decryptJson(saved[0].config_encrypted).account_id).toBe('abc123def456')
    })

    it('để account id là null khi endpoint không theo mẫu R2', async () => {
      withR2()
      process.env.R2_ENDPOINT = 'https://endpoint-tu-dung.vn'

      await seeder.onApplicationBootstrap()

      expect(crypto.decryptJson(saved[0].config_encrypted).account_id).toBeNull()
    })

    it('nhận cả R2_API_TOKEN và CLOUDFLARE_API_TOKEN cho việc đọc dung lượng', async () => {
      withR2()
      process.env.CLOUDFLARE_API_TOKEN = 'cf-token'

      await seeder.onApplicationBootstrap()

      expect(crypto.decryptJson(saved[0].config_encrypted).cf_api_token).toBe('cf-token')
      delete process.env.CLOUDFLARE_API_TOKEN
    })

    it('không tạo gì khi thiếu bất kỳ biến bắt buộc nào', async () => {
      withR2()
      delete process.env.R2_SECRET_ACCESS_KEY

      await seeder.onApplicationBootstrap()

      expect(savedFromEnv()).toHaveLength(0)
    })
  })

  describe('Cloudinary từ biến môi trường', () => {
    it('tạo dịch vụ Cloudinary nhưng không đặt làm mặc định', async () => {
      withCloudinary()

      await seeder.onApplicationBootstrap()

      expect(saved[0]).toMatchObject({ driver: StorageDriver.CLOUDINARY, is_enabled: true, is_default: false })
      expect(crypto.decryptJson(saved[0].config_encrypted)).toMatchObject({
        cloud_name: 'dai7fok3c',
        api_key: 'cl-key',
        api_secret: 'cl-secret',
        folder: 'hvm',
      })
    })
  })

  describe('Ổ đĩa máy chủ từ biến môi trường', () => {
    it('tạo dịch vụ Local nhưng để sẵn ở chế độ chỉ đọc, vì ổ đĩa đang gần đầy', async () => {
      process.env.STORAGE_PATH = '/usr/app/storage'
      process.env.FILE_DOMAIN = 'https://file.hvmv.edu.vn'

      await seeder.onApplicationBootstrap()

      expect(saved[0]).toMatchObject({
        driver: StorageDriver.LOCAL,
        // Tắt nhận upload: file cũ vẫn lấy ra được, nhưng không nhận thêm file mới
        is_enabled: false,
        is_system: true,
        priority: 90,
        public_base_url: 'https://file.hvmv.edu.vn',
      })
      expect(crypto.decryptJson(saved[0].config_encrypted).root_path).toBe('/usr/app/storage')
    })
  })

  describe('HVM Storage (mặc định trong code, env thắng)', () => {
    it('tạo bằng giá trị mặc định khi không có env: bật, mặc định, priority 5, public_base_url = base_url', async () => {
      await seeder.onApplicationBootstrap()

      expect(saved).toHaveLength(1)
      expect(saved[0]).toMatchObject({
        name: 'HVM Storage (mặc định)',
        driver: StorageDriver.HVM,
        is_enabled: true,
        is_default: true,
        is_system: true,
        priority: 5,
        public_base_url: HVM_STORAGE_DEFAULT_URL,
      })
      expect(crypto.decryptJson(saved[0].config_encrypted)).toMatchObject({
        base_url: HVM_STORAGE_DEFAULT_URL,
        api_key: HVM_STORAGE_DEFAULT_API_KEY,
      })
      expect(saved[0].config_encrypted).not.toContain(HVM_STORAGE_DEFAULT_API_KEY)
    })

    it('env HVM_STORAGE_URL / HVM_STORAGE_API_KEY thắng mặc định, bỏ dấu / cuối URL', async () => {
      process.env.HVM_STORAGE_URL = 'https://storage.test/'
      process.env.HVM_STORAGE_API_KEY = 'hvmk_academy_moi'

      await seeder.onApplicationBootstrap()

      expect(saved[0].name).toBe('HVM Storage (từ biến môi trường)')
      expect(saved[0].public_base_url).toBe('https://storage.test')
      expect(crypto.decryptJson(saved[0].config_encrypted)).toMatchObject({ base_url: 'https://storage.test', api_key: 'hvmk_academy_moi' })
    })

    it('hạ cờ mặc định của dịch vụ khác để chỉ còn một dịch vụ mặc định', async () => {
      withR2()

      await seeder.onApplicationBootstrap()

      expect(providerRepository.update).toHaveBeenCalledWith({ is_default: true }, { is_default: false })
      expect(saved.filter(item => item.is_default).map(item => item.driver)).toEqual([StorageDriver.HVM])
    })

    it('đã có dòng hvm thì không tạo lại (idempotent khi restart)', async () => {
      const existing = Object.assign(new StorageProviderEntity(), {
        id: 1,
        name: 'HVM Storage (mặc định)',
        driver: StorageDriver.HVM,
        config_encrypted: crypto.encryptJson({ base_url: HVM_STORAGE_DEFAULT_URL, api_key: HVM_STORAGE_DEFAULT_API_KEY }),
      })
      providerRepository.find.mockResolvedValue([existing])

      await seeder.onApplicationBootstrap()

      expect(saved).toHaveLength(0)
      expect(providerRepository.update).not.toHaveBeenCalled()
    })

    it('đã có dòng hvm và env đặt key mới thì cập nhật config, không đụng cờ của người dùng', async () => {
      const existing = Object.assign(new StorageProviderEntity(), {
        id: 1,
        name: 'HVM Storage (mặc định)',
        driver: StorageDriver.HVM,
        is_enabled: false,
        is_default: false,
        config_encrypted: crypto.encryptJson({ base_url: HVM_STORAGE_DEFAULT_URL, api_key: 'cu', folder_path: 'academy' }),
      })
      providerRepository.find.mockResolvedValue([existing])
      process.env.HVM_STORAGE_API_KEY = 'hvmk_academy_moi'

      await seeder.onApplicationBootstrap()

      expect(providerRepository.save).toHaveBeenCalledTimes(1)
      expect(crypto.decryptJson(existing.config_encrypted)).toEqual({
        base_url: HVM_STORAGE_DEFAULT_URL,
        api_key: 'hvmk_academy_moi',
        folder_path: 'academy',
      })
      expect(existing.is_enabled).toBe(false)
      expect(existing.is_default).toBe(false)
    })

    it('đã có dòng hvm, env khớp config hiện tại thì không ghi gì', async () => {
      const existing = Object.assign(new StorageProviderEntity(), {
        id: 1,
        driver: StorageDriver.HVM,
        config_encrypted: crypto.encryptJson({ base_url: 'https://storage.test', api_key: 'k' }),
      })
      providerRepository.find.mockResolvedValue([existing])
      process.env.HVM_STORAGE_URL = 'https://storage.test'
      process.env.HVM_STORAGE_API_KEY = 'k'

      await seeder.onApplicationBootstrap()

      expect(providerRepository.save).not.toHaveBeenCalled()
    })

    it('dòng hvm đã xoá mềm: không tạo lại và cũng không sửa', async () => {
      const deleted = Object.assign(new StorageProviderEntity(), {
        id: 1,
        driver: StorageDriver.HVM,
        deleted_at: new Date(),
        config_encrypted: crypto.encryptJson({ base_url: 'x', api_key: 'y' }),
      })
      providerRepository.find.mockResolvedValue([deleted])
      process.env.HVM_STORAGE_API_KEY = 'moi'

      await seeder.onApplicationBootstrap()

      expect(providerRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('không tạo trùng', () => {
    it('bỏ qua khi đã có dịch vụ cùng bucket', async () => {
      withR2()
      providerRepository.find.mockResolvedValue([
        Object.assign(new StorageProviderEntity(), {
          driver: StorageDriver.S3,
          preset: 'cloudflare_r2',
          config_encrypted: crypto.encryptJson({ bucket: 'hvm' }),
        }),
      ])

      await seeder.onApplicationBootstrap()

      expect(savedFromEnv()).toHaveLength(0)
    })

    it('vẫn tạo khi dịch vụ đã có trỏ sang bucket khác', async () => {
      withR2()
      providerRepository.find.mockResolvedValue([
        Object.assign(new StorageProviderEntity(), {
          driver: StorageDriver.S3,
          preset: 'cloudflare_r2',
          config_encrypted: crypto.encryptJson({ bucket: 'bucket-khac' }),
        }),
      ])

      await seeder.onApplicationBootstrap()

      expect(savedFromEnv()).toHaveLength(1)
    })

    it('tính cả dịch vụ đã xoá mềm, để không dựng lại cái người dùng vừa xoá', async () => {
      withR2()

      await seeder.onApplicationBootstrap()

      expect(providerRepository.find).toHaveBeenCalledWith(expect.objectContaining({ withDeleted: true }))
    })
  })

  describe('hành vi chung', () => {
    it('tạo cả 3 dịch vụ từ env khi có đủ biến môi trường, rồi tới HVM sau cùng', async () => {
      withR2()
      withCloudinary()
      process.env.STORAGE_PATH = '/usr/app/storage'

      await seeder.onApplicationBootstrap()

      expect(saved.map(item => item.driver)).toEqual([StorageDriver.S3, StorageDriver.CLOUDINARY, StorageDriver.LOCAL, StorageDriver.HVM])
    })

    it('lấy dung lượng ngay sau khi tạo, để trang quản lý có số liệu thật', async () => {
      withR2()

      await seeder.onApplicationBootstrap()

      expect(usageService.refreshAllUsage).toHaveBeenCalled()
    })

    it('không có biến môi trường nào thì vẫn tạo HVM Storage mặc định (và chỉ nó)', async () => {
      await seeder.onApplicationBootstrap()

      expect(saved.map(item => item.driver)).toEqual([StorageDriver.HVM])
      expect(usageService.refreshAllUsage).toHaveBeenCalled()
    })

    it('lỗi trong seeder không chặn app khởi động', async () => {
      withR2()
      providerRepository.save.mockRejectedValue(new Error('DB chua san sang'))

      await expect(seeder.onApplicationBootstrap()).resolves.toBeUndefined()
    })
  })
})
