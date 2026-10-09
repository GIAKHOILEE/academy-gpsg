import { StorageDriver, StorageProviderStatus, StorageStrategy } from '@enums/storage.enum'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import { SECRET_MASK } from '../storage.constants'
import { StorageCryptoService } from '../services/storage-crypto.service'
import { StorageDriverFactory } from '../services/storage-driver.factory'
import { StorageProviderService } from '../services/storage-provider.service'

const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), {
    id: 1,
    name: 'R2 chinh',
    driver: StorageDriver.S3,
    preset: 'cloudflare_r2',
    is_enabled: true,
    is_default: false,
    is_system: false,
    priority: 100,
    weight: 1,
    status: StorageProviderStatus.HEALTHY,
    ...overrides,
  })

describe('StorageProviderService', () => {
  let service: StorageProviderService
  let crypto: StorageCryptoService
  let providerRepository: any
  let fileRepository: any
  let settingRepository: any
  let driverFactory: StorageDriverFactory
  let savedProviders: StorageProviderEntity[]

  beforeEach(() => {
    process.env.STORAGE_ENCRYPTION_KEY = 'khoa-test'
    crypto = new StorageCryptoService()
    driverFactory = new StorageDriverFactory(crypto)
    savedProviders = []

    providerRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      create: jest.fn((value: any) => Object.assign(new StorageProviderEntity(), value)),
      save: jest.fn(async (value: any) => {
        savedProviders.push(value)
        if (!value.id) value.id = savedProviders.length
        return value
      }),
      update: jest.fn(async () => undefined),
      softRemove: jest.fn(async (value: any) => value),
    }
    fileRepository = { count: jest.fn(async () => 0) }
    settingRepository = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value: any) => Object.assign(new StorageSettingEntity(), value)),
      save: jest.fn(async (value: any) => value),
    }

    service = new StorageProviderService(providerRepository, fileRepository, settingRepository, crypto, driverFactory)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })

  describe('toResponse - che secret', () => {
    it('che secret nhưng giữ 4 ký tự cuối để người dùng nhận ra key nào', () => {
      const provider = makeProvider({
        config_encrypted: crypto.encryptJson({
          preset: 'cloudflare_r2',
          bucket: 'hvm',
          account_id: 'account-abc',
          access_key_id: 'AKIA1234567890',
          secret_access_key: 'sieu-bi-mat-9876',
          cf_api_token: 'token-bi-mat-4321',
        }),
      })

      const response = service.toResponse(provider)

      // Field thường trả nguyên giá trị
      expect(response.config.bucket).toBe('hvm')
      expect(response.config.account_id).toBe('account-abc')
      expect(response.config.access_key_id).toBe('AKIA1234567890')
      // Field secret bị che
      expect(response.config.secret_access_key).toBe(`${SECRET_MASK}9876`)
      expect(response.config.cf_api_token).toBe(`${SECRET_MASK}4321`)
      // Secret thật không được lọt ra bất kỳ đâu trong payload
      expect(JSON.stringify(response)).not.toContain('sieu-bi-mat')
      expect(JSON.stringify(response)).not.toContain('token-bi-mat')
    })

    it('che toàn bộ khi secret quá ngắn, không hé ra ký tự nào', () => {
      const provider = makeProvider({
        config_encrypted: crypto.encryptJson({ preset: 'aws_s3', secret_access_key: 'abc' }),
      })

      expect(service.toResponse(provider).config.secret_access_key).toBe(SECRET_MASK)
    })

    it('không trả ra field lạ không có trong schema, tránh rò dữ liệu nội bộ', () => {
      const provider = makeProvider({
        config_encrypted: crypto.encryptJson({ preset: 'aws_s3', bucket: 'b', field_la_nao_do: 'gia-tri' }),
      })

      expect(service.toResponse(provider).config).not.toHaveProperty('field_la_nao_do')
    })

    it('bỏ qua field rỗng để form không hiện ô đã điền sẵn chuỗi trắng', () => {
      const provider = makeProvider({
        config_encrypted: crypto.encryptJson({ preset: 'aws_s3', bucket: 'b', region: '', endpoint: null }),
      })

      const config = service.toResponse(provider).config
      expect(config).not.toHaveProperty('region')
      expect(config).not.toHaveProperty('endpoint')
    })

    it('kèm nhãn driver, nhãn preset và capabilities cho UI', () => {
      const response = service.toResponse(makeProvider({ config_encrypted: crypto.encryptJson({}) }))

      expect(response.driver_label).toBe('S3 / tương thích S3')
      expect(response.preset_label).toBe('Cloudflare R2')
      expect(response.capabilities.listing).toBe(true)
    })
  })

  describe('mergeConfig - giữ secret cũ khi form gửi lại giá trị đã che', () => {
    const merge = (current: Record<string, any>, incoming: Record<string, any>) => service['mergeConfig'](StorageDriver.S3, current, incoming)

    it('giữ secret cũ khi client gửi lại nguyên chuỗi che', () => {
      const merged = merge({ secret_access_key: 'secret-that', bucket: 'cu' }, { secret_access_key: `${SECRET_MASK}that`, bucket: 'moi' })

      expect(merged.secret_access_key).toBe('secret-that')
      expect(merged.bucket).toBe('moi')
    })

    it('nhận secret mới khi client thật sự nhập giá trị mới', () => {
      const merged = merge({ secret_access_key: 'secret-cu' }, { secret_access_key: 'secret-moi-hoan-toan' })

      expect(merged.secret_access_key).toBe('secret-moi-hoan-toan')
    })

    it('giữ lại field cũ mà client không gửi lên', () => {
      const merged = merge({ bucket: 'hvm', region: 'ap-southeast-1' }, { bucket: 'hvm-2' })

      expect(merged.region).toBe('ap-southeast-1')
    })

    it('không áp dụng quy tắc che cho field không phải secret', () => {
      // access_key_id không phải secret, nên giá trị trông giống chuỗi che vẫn được ghi
      const merged = merge({ access_key_id: 'cu' }, { access_key_id: `${SECRET_MASK}moi` })

      expect(merged.access_key_id).toBe(`${SECRET_MASK}moi`)
    })
  })

  describe('buildQuota - công thức dung lượng', () => {
    it('tính đủ used, total, free và phần trăm', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '2500000000', quota_limit_bytes: '10000000000', usage_objects: '1234' }))

      expect(quota.used_bytes).toBe(2500000000)
      expect(quota.total_bytes).toBe(10000000000)
      expect(quota.free_bytes).toBe(7500000000)
      expect(quota.used_percent).toBe(25)
      expect(quota.object_count).toBe(1234)
      expect(quota.limit_source).toBe('manual')
    })

    it('hạn mức tự đặt thắng số dịch vụ báo', () => {
      // Google Drive báo 15GB nhưng ta chỉ muốn dùng 5GB
      const quota = service.buildQuota(makeProvider({ usage_bytes: '1000000000', usage_total_bytes: '15000000000', quota_limit_bytes: '5000000000' }))

      expect(quota.total_bytes).toBe(5000000000)
      expect(quota.limit_source).toBe('manual')
    })

    it('dùng số dịch vụ báo khi không tự đặt hạn mức', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '1000', usage_total_bytes: '4000' }))

      expect(quota.total_bytes).toBe(4000)
      expect(quota.used_percent).toBe(25)
      expect(quota.limit_source).toBe('provider')
    })

    it('để null khi không biết hạn mức, thay vì đoán bừa', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '1000' }))

      expect(quota.total_bytes).toBeNull()
      expect(quota.free_bytes).toBeNull()
      expect(quota.used_percent).toBeNull()
      expect(quota.limit_source).toBe('none')
    })

    it('không cho free_bytes xuống số âm khi đã dùng vượt hạn mức', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '12000', quota_limit_bytes: '10000' }))

      expect(quota.free_bytes).toBe(0)
      expect(quota.used_percent).toBe(100)
    })

    it('chặn phần trăm ở mức 100 để thanh tiến độ không vỡ', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '999999', quota_limit_bytes: '1000' }))

      expect(quota.used_percent).toBe(100)
    })

    it('làm tròn phần trăm tới 2 chữ số thập phân', () => {
      const quota = service.buildQuota(makeProvider({ usage_bytes: '333', quota_limit_bytes: '1000' }))

      expect(quota.used_percent).toBe(33.3)
    })

    it('tách riêng own_bytes khi nó khác used_bytes', () => {
      // Local: used là cả ổ đĩa, own là thư mục ta quản lý
      const quota = service.buildQuota(makeProvider({ usage_bytes: '90000', usage_own_bytes: '1500' }))

      expect(quota.used_bytes).toBe(90000)
      expect(quota.own_bytes).toBe(1500)
    })
  })

  describe('createProvider', () => {
    const validConfig = {
      preset: 'cloudflare_r2',
      bucket: 'hvm',
      account_id: 'acc',
      access_key_id: 'key',
      secret_access_key: 'secret',
    }

    beforeEach(() => {
      jest.spyOn(service, 'refreshStatus').mockResolvedValue({ ok: true, message: 'ok', provider: null } as never)
      jest.spyOn(service, 'getProviderById').mockImplementation(async () => ({ id: 1 }) as never)
    })

    it('mã hoá config trước khi lưu, không để plaintext trong DB', async () => {
      await service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: validConfig })

      const saved = savedProviders[0]
      expect(saved.config_encrypted).not.toContain('secret')
      expect(crypto.isEncrypted(saved.config_encrypted)).toBe(true)
      expect(crypto.decryptJson(saved.config_encrypted).secret_access_key).toBe('secret')
    })

    it('từ chối config thiếu field bắt buộc, kèm danh sách thiếu gì', async () => {
      await expect(service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: { preset: 'cloudflare_r2' } })).rejects.toMatchObject({
        response: expect.objectContaining({
          data: expect.objectContaining({ errors: expect.stringContaining('Bucket') }),
        }),
      })
    })

    it('dịch vụ đầu tiên tự thành mặc định, nếu không sẽ không có chỗ nhận upload', async () => {
      providerRepository.count.mockResolvedValue(1)
      const setDefault = jest.spyOn(service, 'setDefault').mockResolvedValue(null as never)

      await service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: validConfig })

      expect(setDefault).toHaveBeenCalled()
    })

    it('dịch vụ thứ hai không tự chiếm vị trí mặc định', async () => {
      providerRepository.count.mockResolvedValue(2)
      const setDefault = jest.spyOn(service, 'setDefault').mockResolvedValue(null as never)

      await service.createProvider({ name: 'B2', driver: StorageDriver.S3, config: validConfig })

      expect(setDefault).not.toHaveBeenCalled()
    })

    it('chuẩn hoá tiền tố đường dẫn, bỏ dấu / ở hai đầu', async () => {
      await service.createProvider({
        name: 'R2',
        driver: StorageDriver.S3,
        config: validConfig,
        path_prefix: '/hvm/2026/',
      })

      expect(savedProviders[0].path_prefix).toBe('hvm/2026')
    })

    it('tiền tố chỉ gồm dấu / được coi như không có', async () => {
      await service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: validConfig, path_prefix: '///' })

      expect(savedProviders[0].path_prefix).toBeNull()
    })

    it('đánh dấu trạng thái là chưa biết cho tới khi test xong', async () => {
      await service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: validConfig })

      expect(savedProviders[0].status).toBe(StorageProviderStatus.UNKNOWN)
    })

    it('lỗi khi test dịch vụ mới không làm hỏng việc tạo', async () => {
      jest.spyOn(service, 'refreshStatus').mockRejectedValue(new Error('khong ket noi duoc'))

      await expect(service.createProvider({ name: 'R2', driver: StorageDriver.S3, config: validConfig })).resolves.toBeDefined()
    })
  })

  describe('deleteProvider', () => {
    it('chặn xoá khi còn file trong danh mục, vì xoá đi là mất dấu file', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider())
      fileRepository.count.mockResolvedValue(42)

      await expect(service.deleteProvider(1)).rejects.toMatchObject({
        response: expect.objectContaining({ data: expect.objectContaining({ file_count: 42 }) }),
      })
      expect(providerRepository.softRemove).not.toHaveBeenCalled()
    })

    it('xoá được khi không còn file nào', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider())
      fileRepository.count.mockResolvedValue(0)

      await expect(service.deleteProvider(1)).resolves.toEqual({ id: 1, deleted: true })
      expect(providerRepository.softRemove).toHaveBeenCalled()
    })

    it('chỉ định dịch vụ mặc định mới sau khi xoá dịch vụ mặc định cũ', async () => {
      providerRepository.findOne.mockResolvedValueOnce(makeProvider({ id: 1, is_default: true })).mockResolvedValueOnce(makeProvider({ id: 2 }))
      fileRepository.count.mockResolvedValue(0)
      const setDefault = jest.spyOn(service, 'setDefault').mockResolvedValue(null as never)

      await service.deleteProvider(1)

      expect(setDefault).toHaveBeenCalledWith(2)
    })
  })

  describe('setDefault', () => {
    it('bỏ cờ mặc định của mọi dịch vụ khác trước khi gán cho dịch vụ mới', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider({ id: 5 }))
      jest.spyOn(service, 'getProviderById').mockResolvedValue({ id: 5 } as never)

      await service.setDefault(5)

      expect(providerRepository.update).toHaveBeenCalledWith({ is_default: true }, { is_default: false })
      expect(savedProviders[0].is_default).toBe(true)
    })
  })

  describe('testConfig', () => {
    it('trả lỗi validate mà không cố gọi ra dịch vụ bên ngoài', async () => {
      const result = await service.testConfig({ driver: StorageDriver.S3, config: { preset: 'aws_s3' } })

      expect(result.ok).toBe(false)
      expect(result.message).toContain('Bucket')
    })

    it('lấy secret thật từ DB khi form chỉ giữ chuỗi che', async () => {
      providerRepository.findOne.mockResolvedValue(
        makeProvider({
          config_encrypted: crypto.encryptJson({
            preset: 'cloudflare_r2',
            bucket: 'hvm',
            account_id: 'acc',
            access_key_id: 'key',
            secret_access_key: 'secret-that-trong-db',
          }),
        }),
      )

      const createFromConfig = jest.spyOn(driverFactory, 'createFromConfig').mockReturnValue({
        test: async () => ({ ok: true, message: 'ok' }),
      } as never)

      await service.testConfig({
        driver: StorageDriver.S3,
        provider_id: 1,
        config: { preset: 'cloudflare_r2', bucket: 'hvm', account_id: 'acc', access_key_id: 'key', secret_access_key: SECRET_MASK },
      })

      expect(createFromConfig).toHaveBeenCalledWith(
        StorageDriver.S3,
        expect.objectContaining({ secret_access_key: 'secret-that-trong-db' }),
        undefined,
      )
    })

    it('không để lỗi khởi tạo driver thoát ra ngoài dạng exception', async () => {
      jest.spyOn(driverFactory, 'createFromConfig').mockImplementation(() => {
        throw new Error('cau hinh sai')
      })

      const result = await service.testConfig({
        driver: StorageDriver.S3,
        config: { preset: 'aws_s3', bucket: 'b', access_key_id: 'k', secret_access_key: 's' },
      })

      expect(result).toEqual({ ok: false, message: 'cau hinh sai', details: null })
    })
  })

  describe('refreshStatus', () => {
    it('ghi trạng thái khoẻ khi test thành công', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider({ status: StorageProviderStatus.ERROR }))
      jest.spyOn(driverFactory, 'create').mockReturnValue({
        test: async () => ({ ok: true, message: 'Kết nối thành công' }),
      } as never)

      const result = await service.refreshStatus(1)

      expect(result.ok).toBe(true)
      expect(savedProviders[0].status).toBe(StorageProviderStatus.HEALTHY)
      expect(savedProviders[0].status_checked_at).toBeDefined()
    })

    it('ghi trạng thái lỗi kèm thông báo khi test thất bại', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider())
      jest.spyOn(driverFactory, 'create').mockReturnValue({
        test: async () => ({ ok: false, message: 'Access Key ID không đúng' }),
      } as never)

      await service.refreshStatus(1)

      expect(savedProviders[0].status).toBe(StorageProviderStatus.ERROR)
      expect(savedProviders[0].status_message).toBe('Access Key ID không đúng')
    })

    it('cắt thông báo lỗi quá dài để không vượt độ dài cột', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider())
      jest.spyOn(driverFactory, 'create').mockReturnValue({
        test: async () => ({ ok: false, message: 'x'.repeat(5000) }),
      } as never)

      await service.refreshStatus(1)

      expect(savedProviders[0].status_message.length).toBe(1000)
    })

    it('driver throw cũng được ghi thành trạng thái lỗi, không làm sập API', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider())
      jest.spyOn(driverFactory, 'create').mockImplementation(() => {
        throw new Error('khong dung driver duoc')
      })

      const result = await service.refreshStatus(1)

      expect(result.ok).toBe(false)
      expect(savedProviders[0].status).toBe(StorageProviderStatus.ERROR)
    })
  })

  describe('cấu hình chung', () => {
    it('tự tạo dòng cấu hình mặc định ở lần đọc đầu tiên', async () => {
      const settings = await service.getSettings()

      expect(settingRepository.save).toHaveBeenCalled()
      expect(settings.id).toBe(1)
    })

    it('dùng lại dòng đã có thay vì tạo thêm', async () => {
      settingRepository.findOne.mockResolvedValue(Object.assign(new StorageSettingEntity(), { id: 1, strategy: StorageStrategy.PRIORITY_FILL }))

      const settings = await service.getSettings()

      expect(settings.strategy).toBe(StorageStrategy.PRIORITY_FILL)
      expect(settingRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('getDriverSchemas', () => {
    it('trả đủ schema, preset, hướng dẫn chung và giải thích chiến lược cho FE', () => {
      const schemas = service.getDriverSchemas()

      expect(schemas.drivers.length).toBe(Object.values(StorageDriver).length)
      expect(schemas.s3_presets.length).toBeGreaterThan(15)
      expect(schemas.secret_mask).toBe(SECRET_MASK)
      expect(schemas.common_fields.length).toBeGreaterThan(0)
      expect(schemas.strategies).toHaveLength(4)

      for (const strategy of schemas.strategies) {
        expect(strategy.label).toBeTruthy()
        expect(strategy.help).toBeTruthy()
      }
    })

    it('không chứa bất kỳ secret nào vì đây là dữ liệu tĩnh', () => {
      expect(JSON.stringify(service.getDriverSchemas())).not.toContain('secret_access_key":"')
    })
  })
})
