import { StorageDriver } from '@enums/storage.enum'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageService } from '../services/storage.service'

const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), {
    id: 1,
    name: 'R2',
    driver: StorageDriver.S3,
    priority: 100,
    public_base_url: null,
    ...overrides,
  })

const makeMulterFile = (name = 'anh.png'): Express.Multer.File =>
  ({ originalname: name, mimetype: 'image/png', buffer: Buffer.from('x'), size: 1 }) as Express.Multer.File

describe('StorageService (lớp mặt tiền cho code cũ)', () => {
  let service: StorageService
  let providerRepository: any
  let fileRepository: any
  let fileService: any
  let driverFactory: any
  let driver: any

  beforeEach(() => {
    driver = { delete: jest.fn(async () => undefined) }
    providerRepository = { count: jest.fn(async () => 1), find: jest.fn(async () => []) }
    fileRepository = { findOne: jest.fn(async () => null) }
    fileService = {
      upload: jest.fn(async () => ({
        file: Object.assign(new StorageFileEntity(), { id: 9, url: 'https://cdn.test/anh.png' }),
        provider: { id: 1, name: 'R2', driver: StorageDriver.S3 },
        route_reason: '',
      })),
      getSignedUrl: jest.fn(async () => ({ url: 'https://cdn.test/signed', signed: true, expires_in: 3600 })),
      deleteFile: jest.fn(async () => ({ id: 9, deleted: true })),
    }
    driverFactory = { create: jest.fn(() => driver) }

    service = new StorageService(providerRepository, fileRepository, fileService, driverFactory)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
  })

  describe('isReady', () => {
    it('sẵn sàng khi có ít nhất một dịch vụ đang bật', async () => {
      expect(await service.isReady()).toBe(true)
      expect(providerRepository.count).toHaveBeenCalledWith({ where: { is_enabled: true } })
    })

    it('chưa sẵn sàng khi chưa cấu hình dịch vụ nào, để code cũ dùng lại đường env', async () => {
      providerRepository.count.mockResolvedValue(0)

      expect(await service.isReady()).toBe(false)
    })
  })

  describe('uploadAndGetUrl', () => {
    it('trả về URL công khai đúng như hợp đồng cũ (nhận file, trả chuỗi URL)', async () => {
      expect(await service.uploadAndGetUrl(makeMulterFile())).toBe('https://cdn.test/anh.png')
    })

    it('truyền thư mục nghiệp vụ dạng đường dẫn, để tạo trên đúng dịch vụ router chọn', async () => {
      await service.uploadAndGetUrl(makeMulterFile('a.pdf'), 'pdf')

      expect(fileService.upload).toHaveBeenCalledWith(expect.anything(), { folder_path: 'pdf' })
    })

    it('rơi về link có hạn khi dịch vụ không cấp URL công khai', async () => {
      // Dropbox/OneDrive bị tổ chức chặn chia sẻ công khai thì url sẽ là null
      fileService.upload.mockResolvedValue({
        file: Object.assign(new StorageFileEntity(), { id: 9, url: null }),
        provider: { id: 1, name: 'Dropbox', driver: StorageDriver.DROPBOX },
        route_reason: '',
      })

      expect(await service.uploadAndGetUrl(makeMulterFile())).toBe('https://cdn.test/signed')
    })
  })

  describe('uploadManyAndGetUrls', () => {
    it('trả về mảng URL theo đúng thứ tự file đầu vào', async () => {
      fileService.upload
        .mockResolvedValueOnce({ file: { id: 1, url: 'u1' }, provider: {}, route_reason: '' })
        .mockResolvedValueOnce({ file: { id: 2, url: 'u2' }, provider: {}, route_reason: '' })

      expect(await service.uploadManyAndGetUrls([makeMulterFile('a.png'), makeMulterFile('b.png')])).toEqual(['u1', 'u2'])
    })
  })

  describe('deleteByUrl', () => {
    it('xoá qua danh mục khi tìm thấy URL trong index', async () => {
      fileRepository.findOne.mockResolvedValue(Object.assign(new StorageFileEntity(), { id: 9 }))

      expect(await service.deleteByUrl('https://cdn.test/anh.png')).toBe(true)
      // force = true vì đây là lệnh xoá có chủ đích từ nghiệp vụ
      expect(fileService.deleteFile).toHaveBeenCalledWith(9, true)
    })

    it('suy ra dịch vụ từ URL để xoá được cả file chưa có trong danh mục', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Cloudinary', public_base_url: null }),
        makeProvider({ id: 2, name: 'R2', public_base_url: 'https://pub-test.r2.dev' }),
      ])

      const deleted = await service.deleteByUrl('https://pub-test.r2.dev/hvm/anh-cu.png')

      expect(deleted).toBe(true)
      expect(driver.delete).toHaveBeenCalledWith('hvm/anh-cu.png')
    })

    it('giải mã phần trăm trong URL để lấy đúng key có dấu cách', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ public_base_url: 'https://pub-test.r2.dev' })])

      await service.deleteByUrl('https://pub-test.r2.dev/thu%20muc/t%C3%A0i%20li%E1%BB%87u.pdf')

      expect(driver.delete).toHaveBeenCalledWith('thu muc/tài liệu.pdf')
    })

    it('bỏ phần query string khi cắt key', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ public_base_url: 'https://pub-test.r2.dev' })])

      await service.deleteByUrl('https://pub-test.r2.dev/anh.png?v=123')

      expect(driver.delete).toHaveBeenCalledWith('anh.png')
    })

    it('chịu được public_base_url có dấu / ở cuối', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ public_base_url: 'https://pub-test.r2.dev/' })])

      await service.deleteByUrl('https://pub-test.r2.dev/anh.png')

      expect(driver.delete).toHaveBeenCalledWith('anh.png')
    })

    it('không khớp sai domain gần giống nhau', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ public_base_url: 'https://pub-test.r2.dev' })])

      // URL này thuộc domain khác, chỉ tình cờ bắt đầu giống
      expect(await service.deleteByUrl('https://pub-test.r2.dev.khac.vn/anh.png')).toBe(false)
      expect(driver.delete).not.toHaveBeenCalled()
    })

    it('trả false khi không dịch vụ nào nhận URL đó', async () => {
      providerRepository.find.mockResolvedValue([makeProvider({ public_base_url: 'https://pub-test.r2.dev' })])

      expect(await service.deleteByUrl('https://domain-la.vn/anh.png')).toBe(false)
    })

    it('thử dịch vụ tiếp theo khi dịch vụ đầu xoá lỗi', async () => {
      providerRepository.find.mockResolvedValue([
        makeProvider({ id: 1, name: 'Loi', public_base_url: 'https://cdn.test' }),
        makeProvider({ id: 2, name: 'OK', public_base_url: 'https://cdn.test' }),
      ])
      driverFactory.create
        .mockReturnValueOnce({ delete: jest.fn(async () => Promise.reject(new Error('khong xoa duoc'))) })
        .mockReturnValueOnce({ delete: jest.fn(async () => undefined) })

      expect(await service.deleteByUrl('https://cdn.test/anh.png')).toBe(true)
    })

    it('trả false với URL không hợp lệ thay vì throw', async () => {
      expect(await service.deleteByUrl(null)).toBe(false)
      expect(await service.deleteByUrl('')).toBe(false)
      expect(await service.deleteByUrl(123 as never)).toBe(false)
    })
  })
})
