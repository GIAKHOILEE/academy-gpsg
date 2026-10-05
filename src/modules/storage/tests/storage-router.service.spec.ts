import { StorageDriver, StorageProviderStatus, StorageStrategy } from '@enums/storage.enum'
import { Repository } from 'typeorm'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageRouterService } from '../services/storage-router.service'

/** Dựng provider với các giá trị mặc định hợp lý, chỉ khai báo phần cần cho từng test. */
const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), {
    id: 1,
    name: 'Dich vu',
    driver: StorageDriver.S3,
    is_enabled: true,
    is_default: false,
    is_system: false,
    priority: 100,
    weight: 1,
    quota_limit_bytes: null,
    max_file_size_bytes: null,
    allowed_mime_types: null,
    status: StorageProviderStatus.HEALTHY,
    usage_bytes: null,
    usage_own_bytes: null,
    usage_total_bytes: null,
    usage_objects: null,
    round_robin_counter: 0,
    ...overrides,
  })

describe('StorageRouterService', () => {
  let router: StorageRouterService
  let providerRepository: jest.Mocked<Pick<Repository<StorageProviderEntity>, 'find' | 'save'>>
  let providerService: jest.Mocked<Pick<StorageProviderService, 'findProviderOrFail' | 'getSettings' | 'buildQuota'>>
  let settings: StorageSettingEntity

  const realProviderService = Object.create(StorageProviderService.prototype) as StorageProviderService

  beforeEach(() => {
    settings = Object.assign(new StorageSettingEntity(), {
      id: 1,
      strategy: StorageStrategy.MOST_FREE,
      fill_threshold_percent: 95,
      auto_refresh_usage: true,
      usage_refresh_minutes: 60,
    })

    providerRepository = { find: jest.fn(), save: jest.fn(async (value: any) => value) } as never
    providerService = {
      findProviderOrFail: jest.fn(),
      getSettings: jest.fn(async () => settings),
      // Dùng chính hàm thật để công thức tính dung lượng được kiểm luôn
      buildQuota: jest.fn(provider => realProviderService.buildQuota(provider)),
    } as never

    router = new StorageRouterService(providerRepository as never, providerService as never)
  })

  const request = (overrides: Partial<{ sizeBytes: number; mimeType: string; preferredProviderId: number }> = {}) => ({
    sizeBytes: 1000,
    mimeType: 'image/png',
    ...overrides,
  })

  describe('người dùng chỉ định rõ dịch vụ', () => {
    it('tôn trọng lựa chọn của người dùng', async () => {
      const chosen = makeProvider({ id: 7, name: 'R2 chinh' })
      providerService.findProviderOrFail.mockResolvedValue(chosen)

      const decision = await router.route(request({ preferredProviderId: 7 }))

      expect(decision.provider.id).toBe(7)
      expect(decision.strategy).toBe('explicit')
      expect(decision.reason).toContain('R2 chinh')
      // Không cần đọc cấu hình chia tải khi đã chỉ định rõ
      expect(providerService.getSettings).not.toHaveBeenCalled()
    })

    it('vẫn cho upload vào dịch vụ đang tắt, vì tắt chỉ là không tự động chọn', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ id: 7, is_enabled: false }))

      await expect(router.route(request({ preferredProviderId: 7 }))).resolves.toMatchObject({
        provider: expect.objectContaining({ id: 7 }),
      })
    })

    it('nhưng chặn lại khi dịch vụ đã hết dung lượng', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ id: 7, quota_limit_bytes: '1000', usage_bytes: '999' }))

      await expect(router.route(request({ sizeBytes: 5000, preferredProviderId: 7 }))).rejects.toThrow()
    })

    it('chặn lại khi file vượt kích thước tối đa của dịch vụ', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ id: 7, max_file_size_bytes: '500' }))

      await expect(router.route(request({ sizeBytes: 1000, preferredProviderId: 7 }))).rejects.toThrow()
    })

    it('chặn lại khi dịch vụ không nhận loại file đó', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ id: 7, allowed_mime_types: 'application/pdf' }))

      await expect(router.route(request({ mimeType: 'image/png', preferredProviderId: 7 }))).rejects.toThrow()
    })
  })

  describe('lọc ứng viên', () => {
    it('bỏ qua dịch vụ đang tắt, đang lỗi và đã đầy', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Dang tat', is_enabled: false }),
        makeProvider({ id: 2, name: 'Dang loi', status: StorageProviderStatus.ERROR }),
        makeProvider({ id: 3, name: 'Da day', status: StorageProviderStatus.FULL }),
        makeProvider({ id: 4, name: 'Dung duoc' }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(4)
      expect(decision.rejected).toEqual([
        { provider_id: 1, name: 'Dang tat', reason: 'disabled' },
        { provider_id: 2, name: 'Dang loi', reason: 'error' },
        { provider_id: 3, name: 'Da day', reason: 'full' },
      ])
    })

    it('bỏ qua dịch vụ không còn đủ chỗ cho đúng file này', async () => {
      providerRepository.find.mockResolvedValue([
        // Còn trống 100 byte, file cần 1000 byte
        makeProvider({ id: 1, name: 'Gan day', quota_limit_bytes: '1000', usage_bytes: '900' }),
        makeProvider({ id: 2, name: 'Con nhieu', quota_limit_bytes: '1000000', usage_bytes: '0' }),
      ])

      const decision = await router.route(request({ sizeBytes: 1000 }))

      expect(decision.provider.id).toBe(2)
      expect(decision.rejected).toEqual([{ provider_id: 1, name: 'Gan day', reason: 'quota_exceeded' }])
    })

    it('báo lỗi kèm lý do từng dịch vụ khi không còn dịch vụ nào nhận được', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Local', is_enabled: false }),
        makeProvider({ id: 2, name: 'R2', status: StorageProviderStatus.FULL }),
      ])

      await expect(router.route(request())).rejects.toMatchObject({
        response: expect.objectContaining({
          data: expect.objectContaining({
            rejected: 'Local: đang tắt nhận upload; R2: đã hết dung lượng',
          }),
        }),
      })
    })

    describe('khớp loại file', () => {
      const cases: [string, string, boolean][] = [
        ['image/*', 'image/png', true],
        ['image/*', 'application/pdf', false],
        ['image/png,image/jpeg', 'image/jpeg', true],
        ['image/png,image/jpeg', 'image/webp', false],
        ['image/*, application/pdf', 'application/pdf', true],
        ['*', 'application/octet-stream', true],
        ['*/*', 'video/mp4', true],
        ['IMAGE/PNG', 'image/png', true],
        ['image/png', 'IMAGE/PNG', true],
        ['', 'bat-ky/gi-cung-duoc', true],
      ]

      it.each(cases)('allowed="%s" + mime="%s" => nhận: %s', async (allowed, mime, shouldAccept) => {
        providerRepository.find.mockResolvedValue([makeProvider({ id: 1, allowed_mime_types: allowed })])

        if (shouldAccept) {
          await expect(router.route(request({ mimeType: mime }))).resolves.toBeDefined()
        } else {
          await expect(router.route(request({ mimeType: mime }))).rejects.toThrow()
        }
      })
    })
  })

  describe('chiến lược most_free (còn trống nhiều nhất)', () => {
    beforeEach(() => {
      settings.strategy = StorageStrategy.MOST_FREE
    })

    it('chọn dịch vụ còn trống nhiều nhất theo phần trăm, không theo byte', async () => {
      providerRepository.find.mockResolvedValue([
        // Dùng 90% nhưng còn 1GB trống tuyệt đối
        makeProvider({ id: 1, name: 'Lon nhung gan day', quota_limit_bytes: '10000000000', usage_bytes: '9000000000' }),
        // Dùng 10%, chỉ còn 900MB trống nhưng tỉ lệ trống cao hơn
        makeProvider({ id: 2, name: 'Nho ma con rong', quota_limit_bytes: '1000000000', usage_bytes: '100000000' }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
      expect(decision.reason).toContain('còn trống nhiều nhất')
      expect(decision.reason).toContain('90%')
    })

    it('rơi về thứ tự ưu tiên khi không dịch vụ nào có hạn mức để so sánh', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Uu tien thap', priority: 200 }),
        makeProvider({ id: 2, name: 'Uu tien cao', priority: 10 }),
      ])

      const decision = await router.route(request())

      // repository.find đã sắp theo priority ASC, nên phần tử đầu là ưu tiên cao nhất
      expect(decision.provider.id).toBe(1)
      expect(decision.reason).toContain('Chưa dịch vụ nào có hạn mức')
    })

    it('ưu tiên dịch vụ biết hạn mức hơn dịch vụ không biết', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Khong biet han muc' }),
        makeProvider({ id: 2, name: 'Biet han muc', quota_limit_bytes: '1000000', usage_bytes: '10' }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
    })

    it('phá thế bằng dung lượng trống tuyệt đối khi tỉ lệ trống bằng nhau', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Nho', quota_limit_bytes: '1000000', usage_bytes: '500000' }),
        makeProvider({ id: 2, name: 'Lon', quota_limit_bytes: '10000000', usage_bytes: '5000000' }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
    })
  })

  describe('chiến lược priority_fill (ưu tiên lấp đầy)', () => {
    beforeEach(() => {
      settings.strategy = StorageStrategy.PRIORITY_FILL
      settings.fill_threshold_percent = 95
    })

    it('dùng dịch vụ ưu tiên cao nhất khi chưa tới ngưỡng', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Uu tien 1', priority: 1, quota_limit_bytes: '1000', usage_bytes: '500' }),
        makeProvider({ id: 2, name: 'Uu tien 2', priority: 2, quota_limit_bytes: '1000', usage_bytes: '0' }),
      ])

      const decision = await router.route(request({ sizeBytes: 10 }))

      expect(decision.provider.id).toBe(1)
      expect(decision.reason).toContain('50%')
    })

    it('tràn sang dịch vụ tiếp theo khi dịch vụ ưu tiên cao đã vượt ngưỡng', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Uu tien 1', priority: 1, quota_limit_bytes: '1000', usage_bytes: '960' }),
        makeProvider({ id: 2, name: 'Uu tien 2', priority: 2, quota_limit_bytes: '1000', usage_bytes: '0' }),
      ])

      const decision = await router.route(request({ sizeBytes: 10 }))

      expect(decision.provider.id).toBe(2)
    })

    it('dùng ngay dịch vụ chưa biết mức dùng, coi như còn chỗ', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Chua biet', priority: 1 }),
        makeProvider({ id: 2, name: 'Da biet', priority: 2, quota_limit_bytes: '1000', usage_bytes: '0' }),
      ])

      const decision = await router.route(request({ sizeBytes: 10 }))

      expect(decision.provider.id).toBe(1)
      expect(decision.reason).toContain('chưa biết mức dùng')
    })

    it('mọi dịch vụ đều vượt ngưỡng nhưng còn chỗ thì dùng cái trống nhất', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Day 99%', priority: 1, quota_limit_bytes: '10000', usage_bytes: '9900' }),
        makeProvider({ id: 2, name: 'Day 96%', priority: 2, quota_limit_bytes: '10000', usage_bytes: '9600' }),
      ])

      const decision = await router.route(request({ sizeBytes: 10 }))

      expect(decision.provider.id).toBe(2)
      expect(decision.reason).toContain('vượt ngưỡng 95%')
    })

    it('tôn trọng ngưỡng tuỳ chỉnh', async () => {
      settings.fill_threshold_percent = 50

      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Da 60%', priority: 1, quota_limit_bytes: '1000', usage_bytes: '600' }),
        makeProvider({ id: 2, name: 'Moi 10%', priority: 2, quota_limit_bytes: '1000', usage_bytes: '100' }),
      ])

      const decision = await router.route(request({ sizeBytes: 10 }))

      expect(decision.provider.id).toBe(2)
    })
  })

  describe('chiến lược weighted_round_robin (xoay vòng theo trọng số)', () => {
    beforeEach(() => {
      settings.strategy = StorageStrategy.WEIGHTED_ROUND_ROBIN
    })

    it('chia file theo đúng tỉ lệ trọng số qua nhiều lượt', async () => {
      const heavy = makeProvider({ id: 1, name: 'R2', weight: 3 })
      const light = makeProvider({ id: 2, name: 'B2', weight: 1 })
      providerRepository.find.mockResolvedValue([heavy, light])

      const picks: number[] = []
      for (let round = 0; round < 8; round += 1) {
        picks.push((await router.route(request())).provider.id)
      }

      // weight 3:1 => trong 8 lượt, R2 nhận 6 và B2 nhận 2
      expect(picks.filter(id => id === 1)).toHaveLength(6)
      expect(picks.filter(id => id === 2)).toHaveLength(2)
    })

    it('lưu counter xuống DB để tỉ lệ vẫn đúng sau khi restart', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1, weight: 1 })])

      await router.route(request())

      expect(providerRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, round_robin_counter: 1 }))
    })

    it('tiếp tục đúng tỉ lệ từ counter đã có sẵn trong DB', async () => {
      // R2 đã nhận 3 lượt, B2 chưa nhận lượt nào => lượt này phải là của B2
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'R2', weight: 3, round_robin_counter: 3 }),
        makeProvider({ id: 2, name: 'B2', weight: 1, round_robin_counter: 0 }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
    })

    it('phá thế bằng độ ưu tiên khi tỉ lệ đang bằng nhau', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Uu tien thap', weight: 1, priority: 200 }),
        makeProvider({ id: 2, name: 'Uu tien cao', weight: 1, priority: 10 }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
    })

    it('không chia cho 0 khi weight bị đặt bằng 0', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ id: 1, weight: 0 })])

      await expect(router.route(request())).resolves.toMatchObject({ provider: expect.objectContaining({ id: 1 }) })
    })

    it('kéo counter về nhỏ lại khi đã quay quá nhiều vòng, tránh số phình vô hạn', async () => {
      const first = makeProvider({ id: 1, weight: 1, round_robin_counter: 1200 })
      const second = makeProvider({ id: 2, weight: 1, round_robin_counter: 1300 })
      providerRepository.find.mockResolvedValue([first, second])

      await router.route(request())

      // Cả hai đã quay hơn 1000 vòng nên được trừ bớt cùng lúc
      expect(providerRepository.save).toHaveBeenCalledWith([first, second])
      expect(first.round_robin_counter).toBeLessThan(1200)
      expect(second.round_robin_counter).toBeLessThan(1300)
    })
  })

  describe('chiến lược single_default (chỉ dùng dịch vụ mặc định)', () => {
    beforeEach(() => {
      settings.strategy = StorageStrategy.SINGLE_DEFAULT
    })

    it('luôn chọn dịch vụ được đánh dấu mặc định', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Khong mac dinh', priority: 1 }),
        makeProvider({ id: 2, name: 'Mac dinh', priority: 200, is_default: true }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
      expect(decision.reason).toContain('mặc định')
    })

    it('dùng dịch vụ khác khi dịch vụ mặc định không khả dụng', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Mac dinh nhung tat', is_default: true, is_enabled: false }),
        makeProvider({ id: 2, name: 'Du phong' }),
      ])

      const decision = await router.route(request())

      expect(decision.provider.id).toBe(2)
      expect(decision.reason).toContain('Dịch vụ mặc định không khả dụng')
    })
  })
})
