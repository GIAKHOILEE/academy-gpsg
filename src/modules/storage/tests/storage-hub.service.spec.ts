import { Role } from '@enums/role.enum'
import { StorageDriver } from '@enums/storage.enum'
import { ServiceUnavailableException } from '@nestjs/common'
import { HvmStorageDriver } from '../drivers/hvm.driver'
import { StorageHubService } from '../hub/storage-hub.service'

describe('StorageHubService', () => {
  let service: StorageHubService
  let providerService: any
  let driverFactory: any
  let storageService: any
  let driver: HvmStorageDriver
  let createSession: jest.Mock

  const provider = { id: 7, name: 'HVM Storage', driver: StorageDriver.HVM, is_enabled: true }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-25T10:00:00.000Z'))

    driver = new HvmStorageDriver({ base_url: 'https://app.test', api_key: 'k' })
    createSession = jest.fn(async (request: any) => ({
      token: `jwt-${request.subject}-${Date.now()}`,
      expiresAt: new Date(Date.now() + request.ttlSeconds * 1000).toISOString(),
      hubUrl: 'https://app.test/api/hub',
      deliveryOrigin: 'https://video.test',
    }))
    driver.createSession = createSession

    providerService = { findEnabledByDriver: jest.fn(async () => provider) }
    driverFactory = { create: jest.fn(() => driver) }
    storageService = { deleteByUrl: jest.fn(async () => true) }

    service = new StorageHubService(providerService, driverFactory, storageService)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('quyền theo vai trò', () => {
    it.each([
      [Role.STUDENT, ['read']],
      [Role.TEACHER, ['read']],
      [Role.SUPER_ADMIN, ['read', 'upload', 'write', 'delete']],
      [Role.ADMIN, ['read', 'upload', 'write', 'delete']],
      [Role.STAFF, ['read', 'upload', 'write', 'delete']],
      [Role.FINANCE, ['read', 'upload', 'write', 'delete']],
    ])('vai trò %s được %j', (role, expected) => {
      expect(StorageHubService.permissionsFor(role as Role)).toEqual(expected)
    })

    it('vai trò lạ chỉ được đọc', () => {
      expect(StorageHubService.permissionsFor(99 as Role)).toEqual(['read'])
    })

    it('gửi đúng body sang hvm-storage: subject "<role>:<userId>", permissions, ttl 3600', async () => {
      const session = await service.getSession({ userId: 15, role: Role.TEACHER })

      expect(createSession).toHaveBeenCalledWith({ subject: '3:15', permissions: ['read'], ttlSeconds: 3600 })
      expect(session).toEqual({
        hubUrl: 'https://app.test/api/hub',
        token: expect.stringContaining('jwt-3:15'),
        expiresAt: '2026-10-25T11:00:00.000Z',
        deliveryOrigin: 'https://video.test',
        permissions: ['read'],
      })
    })
  })

  describe('cache theo người dùng', () => {
    it('cùng người dùng gọi lại thì dùng token cũ, không gọi hvm-storage lần nữa', async () => {
      const first = await service.getSession({ userId: 1, role: Role.ADMIN })
      const second = await service.getSession({ userId: 1, role: Role.ADMIN })

      expect(second).toBe(first)
      expect(createSession).toHaveBeenCalledTimes(1)
    })

    it('người dùng khác thì token khác', async () => {
      await service.getSession({ userId: 1, role: Role.ADMIN })
      await service.getSession({ userId: 2, role: Role.ADMIN })

      expect(createSession).toHaveBeenCalledTimes(2)
    })

    it('cấp lại khi token còn dưới 5 phút', async () => {
      await service.getSession({ userId: 1, role: Role.ADMIN })

      // 54 phút: còn 6 phút => vẫn dùng cache
      jest.setSystemTime(new Date('2026-10-25T10:54:00.000Z'))
      await service.getSession({ userId: 1, role: Role.ADMIN })
      expect(createSession).toHaveBeenCalledTimes(1)

      // 56 phút: còn 4 phút => cấp mới
      jest.setSystemTime(new Date('2026-10-25T10:56:00.000Z'))
      await service.getSession({ userId: 1, role: Role.ADMIN })
      expect(createSession).toHaveBeenCalledTimes(2)
    })

    it('máy hvm-storage chạy nhanh 7 tiếng: hạn theo đồng hồ máy này, không giữ token hết hạn', async () => {
      // Token sống 1 giờ theo đồng hồ bên kho, nhưng expiresAt báo về là giờ thật + 8 tiếng.
      createSession.mockImplementation(async (request: any) => ({
        token: `jwt-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 3600_000 + request.ttlSeconds * 1000).toISOString(),
        hubUrl: 'https://app.test/api/hub',
        deliveryOrigin: 'https://video.test',
      }))

      const first = await service.getSession({ userId: 1, role: Role.ADMIN })
      expect(first.expiresAt).toBe('2026-10-25T11:00:00.000Z')

      jest.setSystemTime(new Date('2026-10-25T10:56:00.000Z'))
      const second = await service.getSession({ userId: 1, role: Role.ADMIN })
      expect(createSession).toHaveBeenCalledTimes(2)
      expect(second.token).not.toBe(first.token)
    })

    it('máy hvm-storage chạy chậm: lấy mốc sớm hơn của bên kho', async () => {
      createSession.mockImplementation(async (request: any) => ({
        token: 't',
        expiresAt: new Date(Date.now() - 30 * 60_000 + request.ttlSeconds * 1000).toISOString(),
        hubUrl: 'https://app.test/api/hub',
        deliveryOrigin: 'https://video.test',
      }))
      const session = await service.getSession({ userId: 1, role: Role.ADMIN })
      expect(session.expiresAt).toBe('2026-10-25T10:30:00.000Z')
    })

    it('đổi vai trò thì không dùng lại token cũ (quyền khác)', async () => {
      await service.getSession({ userId: 1, role: Role.STUDENT })
      const promoted = await service.getSession({ userId: 1, role: Role.ADMIN })

      expect(createSession).toHaveBeenCalledTimes(2)
      expect(promoted.permissions).toEqual(['read', 'upload', 'write', 'delete'])
    })
  })

  describe('lỗi', () => {
    it('503 khi chưa có dịch vụ hvm nào đang bật', async () => {
      providerService.findEnabledByDriver.mockResolvedValue(null)

      await expect(service.getSession({ userId: 1, role: Role.ADMIN })).rejects.toBeInstanceOf(ServiceUnavailableException)
      await expect(service.getSession({ userId: 1, role: Role.ADMIN })).rejects.toThrow(/HVM Storage/)
    })

    it('503 kèm lý do khi hvm-storage từ chối', async () => {
      createSession.mockRejectedValue(new Error('hvm-storage trả về lỗi 401 khi tạo phiên làm việc: Sai key'))

      await expect(service.getSession({ userId: 1, role: Role.ADMIN })).rejects.toThrow(/Sai key/)
    })

    it('lỗi không bị cache: lần sau gọi lại hvm-storage', async () => {
      createSession.mockRejectedValueOnce(new Error('tạm lỗi'))

      await expect(service.getSession({ userId: 1, role: Role.ADMIN })).rejects.toBeInstanceOf(ServiceUnavailableException)
      await expect(service.getSession({ userId: 1, role: Role.ADMIN })).resolves.toBeDefined()
      expect(createSession).toHaveBeenCalledTimes(2)
    })
  })

  it('deleteByUrl đi qua StorageService.deleteByUrl', async () => {
    await expect(service.deleteByUrl('https://video.test/f/x/a.png')).resolves.toBe(true)
    expect(storageService.deleteByUrl).toHaveBeenCalledWith('https://video.test/f/x/a.png')
  })
})
