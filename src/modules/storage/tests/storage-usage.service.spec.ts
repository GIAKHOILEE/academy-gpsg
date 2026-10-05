import { StorageDriver, StorageProviderStatus } from '@enums/storage.enum'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageUsageService } from '../services/storage-usage.service'

const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), {
    id: 1,
    name: 'R2',
    driver: StorageDriver.S3,
    is_enabled: true,
    is_default: false,
    is_system: false,
    priority: 100,
    status: StorageProviderStatus.HEALTHY,
    ...overrides,
  })

describe('StorageUsageService', () => {
  let service: StorageUsageService
  let providerRepository: any
  let fileRepository: any
  let driverFactory: any
  let providerService: any
  let settings: StorageSettingEntity
  let savedProviders: StorageProviderEntity[]

  const realProviderService = Object.create(StorageProviderService.prototype) as StorageProviderService

  beforeEach(() => {
    savedProviders = []
    settings = Object.assign(new StorageSettingEntity(), {
      id: 1,
      auto_refresh_usage: true,
      usage_refresh_minutes: 60,
    })

    providerRepository = {
      find: jest.fn(async () => []),
      save: jest.fn(async (value: any) => {
        savedProviders.push(value)
        return value
      }),
    }
    fileRepository = {
      count: jest.fn(async () => 0),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ total: '0', bytes: '0', files: '0' })),
      })),
    }
    driverFactory = { create: jest.fn() }
    providerService = {
      findProviderOrFail: jest.fn(),
      getSettings: jest.fn(async () => settings),
      buildQuota: jest.fn(provider => realProviderService.buildQuota(provider)),
    }

    service = new StorageUsageService(providerRepository, fileRepository, driverFactory, providerService)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })

  describe('refreshProviderUsage', () => {
    it('ghi số liệu dung lượng do dịch vụ báo', async () => {
      const provider = makeProvider()
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => ({
          usedBytes: 2500,
          ownBytes: 1200,
          totalBytes: 10000,
          objectCount: 42,
          source: 'provider_api',
        }),
      })

      await service.refreshProviderUsage(1)

      expect(provider).toMatchObject({
        usage_bytes: '2500',
        usage_own_bytes: '1200',
        usage_total_bytes: '10000',
        usage_objects: '42',
        usage_source: 'provider_api',
      })
      expect(provider.usage_checked_at).toBeDefined()
    })

    it('đọc được dung lượng thì coi như kết nối đã khoẻ lại', async () => {
      const provider = makeProvider({ status: StorageProviderStatus.ERROR, status_message: 'loi cu' })
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => ({ usedBytes: 1, totalBytes: null, objectCount: 1, source: 'listing' }),
      })

      await service.refreshProviderUsage(1)

      expect(provider.status).toBe(StorageProviderStatus.HEALTHY)
      expect(provider.status_message).toBeNull()
    })

    it('đánh dấu đầy khi đã dùng hết hạn mức, để router bỏ qua dịch vụ đó', async () => {
      const provider = makeProvider({ quota_limit_bytes: '1000' })
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => ({ usedBytes: 1000, totalBytes: null, objectCount: 1, source: 'listing' }),
      })

      await service.refreshProviderUsage(1)

      expect(provider.status).toBe(StorageProviderStatus.FULL)
      expect(provider.status_message).toContain('hết hạn mức')
    })

    it('chưa đầy thì không đánh dấu đầy', async () => {
      const provider = makeProvider({ quota_limit_bytes: '1000' })
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => ({ usedBytes: 500, totalBytes: null, objectCount: 1, source: 'listing' }),
      })

      await service.refreshProviderUsage(1)

      expect(provider.status).toBe(StorageProviderStatus.HEALTHY)
    })

    it('để null thay vì 0 khi dịch vụ không biết dung lượng', async () => {
      const provider = makeProvider()
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => ({ usedBytes: null, totalBytes: null, objectCount: null, source: 'listing' }),
      })

      await service.refreshProviderUsage(1)

      expect(provider.usage_bytes).toBeNull()
      expect(provider.usage_objects).toBeNull()
    })

    it('rơi về cộng dồn từ danh mục khi không gọi được dịch vụ, để UI vẫn có số', async () => {
      const provider = makeProvider()
      providerService.findProviderOrFail.mockResolvedValue(provider)
      driverFactory.create.mockReturnValue({
        getUsage: async () => {
          throw new Error('token het han')
        },
      })
      fileRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ bytes: '7777', files: '12' })),
      })

      await service.refreshProviderUsage(1)

      expect(provider).toMatchObject({
        usage_bytes: '7777',
        usage_objects: '12',
        usage_source: 'index',
        status: StorageProviderStatus.ERROR,
      })
      expect(provider.status_message).toContain('token het han')
    })
  })

  describe('refreshAllUsage', () => {
    it('lỗi một dịch vụ không chặn các dịch vụ còn lại', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1, name: 'A' }), makeProvider({ id: 2, name: 'B' })])
      jest
        .spyOn(service, 'refreshProviderUsage')
        .mockRejectedValueOnce(new Error('khong ket noi duoc'))
        .mockResolvedValueOnce(null as never)

      const results = await service.refreshAllUsage()

      expect(results).toEqual([
        { provider_id: 1, name: 'A', ok: false, message: 'khong ket noi duoc' },
        { provider_id: 2, name: 'B', ok: true },
      ])
    })
  })

  describe('getOverview', () => {
    it('cộng tổng chỉ trên những dịch vụ biết hạn mức, để con số có nghĩa', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'R2', quota_limit_bytes: '10000', usage_bytes: '2000', usage_objects: '10' }),
        makeProvider({ id: 2, name: 'B2', quota_limit_bytes: '20000', usage_bytes: '5000', usage_objects: '20' }),
        // Dịch vụ không biết hạn mức: không được tính vào total_limit_bytes
        makeProvider({ id: 3, name: 'Khong biet', usage_bytes: '9000', usage_objects: '5' }),
      ])

      const overview = await service.getOverview()

      expect(overview.summary).toMatchObject({
        provider_count: 3,
        total_limit_bytes: 30000,
        used_of_limited_bytes: 7000,
        free_bytes: 23000,
        // 7000 / 30000
        used_percent: 23.33,
        // used_all_bytes tính cả dịch vụ không biết hạn mức
        used_all_bytes: 16000,
        object_count: 35,
      })
    })

    it('để null các số tổng khi chưa dịch vụ nào có hạn mức', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1, usage_bytes: '500' })])

      const overview = await service.getOverview()

      expect(overview.summary).toMatchObject({
        total_limit_bytes: null,
        used_of_limited_bytes: null,
        free_bytes: null,
        used_percent: null,
        used_all_bytes: 500,
      })
    })

    it('đếm đúng số dịch vụ đang bật, sẵn sàng nhận upload và đang lỗi', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, is_enabled: true }),
        makeProvider({ id: 2, is_enabled: false }),
        makeProvider({ id: 3, is_enabled: true, status: StorageProviderStatus.ERROR }),
        makeProvider({ id: 4, is_enabled: true, status: StorageProviderStatus.FULL }),
      ])

      const overview = await service.getOverview()

      expect(overview.summary).toMatchObject({
        provider_count: 4,
        enabled_count: 3,
        // Chỉ id 1 vừa bật, vừa không lỗi, vừa không đầy
        upload_ready_count: 1,
        error_count: 1,
      })
    })

    it('dịch vụ hết chỗ trống không được coi là sẵn sàng nhận upload', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1, quota_limit_bytes: '1000', usage_bytes: '1000' })])

      const overview = await service.getOverview()

      expect(overview.providers[0].can_accept_upload).toBe(false)
    })

    it('dịch vụ chưa biết hạn mức vẫn được coi là sẵn sàng nhận upload', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1 })])

      const overview = await service.getOverview()

      expect(overview.providers[0].can_accept_upload).toBe(true)
    })

    it('kèm số file và dung lượng đang theo dõi trong danh mục', async () => {
      providerRepository.find.mockResolvedValue([])
      fileRepository.count.mockResolvedValue(321)
      fileRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ total: '123456' })),
      })

      const overview = await service.getOverview()

      expect(overview.summary.indexed_file_count).toBe(321)
      expect(overview.summary.indexed_size_bytes).toBe(123456)
    })

    it('hệ thống chưa có dịch vụ nào thì vẫn trả về cấu trúc hợp lệ', async () => {
      providerRepository.find.mockResolvedValue([])

      const overview = await service.getOverview()

      expect(overview.providers).toEqual([])
      expect(overview.summary.provider_count).toBe(0)
      expect(overview.summary.used_all_bytes).toBe(0)
    })
  })

  describe('scheduledRefresh', () => {
    it('không làm gì khi đã tắt tự làm mới', async () => {
      settings.auto_refresh_usage = false
      const refresh = jest.spyOn(service, 'refreshProviderUsage')

      await service.scheduledRefresh()

      expect(refresh).not.toHaveBeenCalled()
      expect(providerRepository.find).not.toHaveBeenCalled()
    })

    it('bỏ qua dịch vụ vừa được làm mới gần đây, tránh gọi API không cần thiết', async () => {
      settings.usage_refresh_minutes = 60
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, usage_checked_at: new Date() }),
        makeProvider({ id: 2, usage_checked_at: new Date(Date.now() - 2 * 60 * 60 * 1000) }),
        makeProvider({ id: 3, usage_checked_at: null }),
      ])
      const refresh = jest.spyOn(service, 'refreshProviderUsage').mockResolvedValue(null as never)

      await service.scheduledRefresh()

      expect(refresh).toHaveBeenCalledTimes(2)
      expect(refresh).toHaveBeenCalledWith(2)
      expect(refresh).toHaveBeenCalledWith(3)
    })

    it('một dịch vụ lỗi không chặn các dịch vụ còn lại', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1 }), makeProvider({ id: 2 })])
      const refresh = jest
        .spyOn(service, 'refreshProviderUsage')
        .mockRejectedValueOnce(new Error('loi'))
        .mockResolvedValueOnce(null as never)

      await expect(service.scheduledRefresh()).resolves.toBeUndefined()
      expect(refresh).toHaveBeenCalledTimes(2)
    })
  })
})
