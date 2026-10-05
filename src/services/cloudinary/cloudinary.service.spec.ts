import { CloudinaryService } from './cloudinary.service'

const sendMock = jest.fn()
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3')
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args: unknown[]) => sendMock(...args) })),
  }
})

/**
 * Service này là cửa upload của hơn 40 module hiện có. Test ở đây chỉ nhằm một
 * việc: chứng minh hợp đồng cũ (nhận file, trả chuỗi URL) không đổi, dù bên dưới
 * đã chuyển sang hệ thống quản lý lưu trữ mới.
 */
describe('CloudinaryService (giữ tương thích cho code cũ)', () => {
  const originalEnv = { ...process.env }
  let service: CloudinaryService
  let cloudinary: any
  let storageService: any

  const makeFile = (name = 'anh.png'): Express.Multer.File =>
    ({ originalname: name, mimetype: 'image/png', buffer: Buffer.from('noi-dung') }) as Express.Multer.File

  beforeEach(() => {
    sendMock.mockReset()
    process.env = { ...originalEnv }

    cloudinary = {
      uploader: {
        upload_stream: jest.fn((_options: any, callback: any) => ({
          end: () => callback(null, { secure_url: 'https://res.cloudinary.com/test/anh.png' }),
        })),
        destroy: jest.fn(async () => ({ result: 'ok' })),
      },
    }
    storageService = {
      isReady: jest.fn(async () => true),
      uploadAndGetUrl: jest.fn(async () => 'https://cdn.moi/anh.png'),
      uploadManyAndGetUrls: jest.fn(async () => ['https://cdn.moi/a.png', 'https://cdn.moi/b.png']),
      deleteByUrl: jest.fn(async () => true),
    }

    service = new CloudinaryService(cloudinary, storageService)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('khi hệ thống lưu trữ mới đã có dịch vụ', () => {
    it('uploadFileV2 chuyển tiếp cho hệ thống mới và trả về URL', async () => {
      expect(await service.uploadFileV2(makeFile())).toBe('https://cdn.moi/anh.png')
      expect(storageService.uploadAndGetUrl).toHaveBeenCalled()
    })

    it('uploadFile cũ chạy y như uploadFileV2', async () => {
      expect(await service.uploadFile(makeFile())).toBe('https://cdn.moi/anh.png')
    })

    it('uploadPdfV2 truyền tiếp thư mục con', async () => {
      await service.uploadPdfV2(makeFile('a.pdf'), 'pdf')

      expect(storageService.uploadAndGetUrl).toHaveBeenCalledWith(expect.anything(), 'pdf')
    })

    it('uploadPdfV2 không truyền thư mục khi tham số rỗng', async () => {
      await service.uploadPdfV2(makeFile('a.pdf'))

      expect(storageService.uploadAndGetUrl).toHaveBeenCalledWith(expect.anything(), undefined)
    })

    it('uploadMultipleFilesV2 trả mảng URL', async () => {
      expect(await service.uploadMultipleFilesV2([makeFile('a.png'), makeFile('b.png')])).toEqual(['https://cdn.moi/a.png', 'https://cdn.moi/b.png'])
    })

    it('deleteFileV2 chuyển tiếp cho hệ thống mới', async () => {
      await service.deleteFileV2('https://cdn.moi/anh.png')

      expect(storageService.deleteByUrl).toHaveBeenCalledWith('https://cdn.moi/anh.png')
    })

    it('deleteFileV2 từ chối URL không phải chuỗi, giữ đúng hành vi cũ', async () => {
      await expect(service.deleteFileV2(null)).rejects.toThrow(/URL phải là chuỗi/)
      await expect(service.deleteFileV2(123 as never)).rejects.toThrow(/URL phải là chuỗi/)
    })

    it('không chạm vào đường cũ qua biến môi trường', async () => {
      await service.uploadFileV2(makeFile())

      expect(sendMock).not.toHaveBeenCalled()
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled()
    })
  })

  describe('khi chưa cấu hình dịch vụ nào (rơi về đường cũ qua biến môi trường)', () => {
    beforeEach(() => {
      storageService.isReady.mockResolvedValue(false)
    })

    it('upload lên R2 khi có biến môi trường R2', async () => {
      process.env.R2_BUCKET_NAME = 'hvm'
      process.env.R2_ENDPOINT = 'https://acc.r2.cloudflarestorage.com'
      process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev'
      sendMock.mockResolvedValue({})

      const url = await new CloudinaryService(cloudinary, storageService).uploadFileV2(makeFile())

      expect(url).toMatch(/^https:\/\/pub-test\.r2\.dev\/\d+_[0-9a-f]{8}\.png$/)
      expect(sendMock).toHaveBeenCalled()
    })

    it('giữ nguyên quy ước thư mục con cho PDF như trước', async () => {
      process.env.R2_BUCKET_NAME = 'hvm'
      process.env.R2_ENDPOINT = 'https://acc.r2.cloudflarestorage.com'
      process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev'
      sendMock.mockResolvedValue({})

      const url = await new CloudinaryService(cloudinary, storageService).uploadPdfV2(makeFile('a.pdf'), 'pdf')

      expect(url).toMatch(/^https:\/\/pub-test\.r2\.dev\/pdf\/\d+_[0-9a-f]{8}\.pdf$/)
    })

    it('upload lên Cloudinary khi không có biến môi trường R2', async () => {
      delete process.env.R2_BUCKET_NAME
      delete process.env.R2_ENDPOINT

      const url = await new CloudinaryService(cloudinary, storageService).uploadFileV2(makeFile())

      expect(url).toBe('https://res.cloudinary.com/test/anh.png')
    })

    it('nhận ra URL Cloudinary và xoá bằng public id đúng', async () => {
      delete process.env.R2_PUBLIC_URL
      delete process.env.STORAGE_PATH

      await new CloudinaryService(cloudinary, storageService).deleteFileV2('https://res.cloudinary.com/demo/image/upload/v1234567890/hvm/anh.png')

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('hvm/anh')
    })

    it('nhận ra URL R2 và xoá đúng object key', async () => {
      process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev'
      process.env.R2_BUCKET_NAME = 'hvm'
      process.env.R2_ENDPOINT = 'https://acc.r2.cloudflarestorage.com'
      sendMock.mockResolvedValue({})

      await new CloudinaryService(cloudinary, storageService).deleteFileV2('https://pub-test.r2.dev/thu%20muc/anh.png')

      expect(sendMock.mock.calls[0][0].input).toMatchObject({ Bucket: 'hvm', Key: 'thu muc/anh.png' })
    })

    it('bỏ qua một cách an toàn khi không nhận ra nơi lưu file', async () => {
      delete process.env.R2_PUBLIC_URL
      delete process.env.STORAGE_PATH

      await expect(new CloudinaryService(cloudinary, storageService).deleteFileV2('https://domain-la.vn/anh.png')).resolves.toBeUndefined()
    })
  })

  describe('bề mặt API công khai', () => {
    it('giữ đủ mọi phương thức mà code cũ đang gọi', () => {
      for (const method of [
        'uploadFile',
        'uploadPdf',
        'uploadMultipleFiles',
        'deleteFile',
        'uploadFileV2',
        'uploadPdfV2',
        'uploadMultipleFilesV2',
        'deleteFileV2',
      ]) {
        expect(typeof service[method]).toBe('function')
      }
    })
  })
})
