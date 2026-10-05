import { StorageDriver, StorageFileKind, StorageFileSource } from '@enums/storage.enum'
import { IStorageDriver } from '../drivers/storage-driver.interface'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageFileService } from '../services/storage-file.service'

const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), {
    id: 1,
    name: 'R2 chinh',
    driver: StorageDriver.S3,
    path_prefix: null,
    ...overrides,
  })

const makeFolder = (overrides: Partial<StorageFolderEntity> = {}): StorageFolderEntity =>
  Object.assign(new StorageFolderEntity(), { id: 10, provider_id: 1, name: 'anh', path: 'anh', ...overrides })

const makeMulterFile = (name: string, mime = 'image/png', content = 'noi-dung'): Express.Multer.File =>
  ({
    originalname: name,
    mimetype: mime,
    buffer: Buffer.from(content),
    size: Buffer.from(content).length,
  }) as Express.Multer.File

describe('StorageFileService', () => {
  let service: StorageFileService
  let fileRepository: any
  let providerRepository: any
  let providerService: any
  let folderService: any
  let driverFactory: any
  let router: any
  let referenceService: any
  let driver: jest.Mocked<IStorageDriver>
  let savedFiles: StorageFileEntity[]

  beforeEach(() => {
    savedFiles = []

    driver = {
      capabilities: { quotaApi: false, listing: true, signedUrl: true, publicUrl: true, realFolders: false, move: true },
      test: jest.fn(),
      upload: jest.fn(async input => ({
        objectKey: input.objectKey,
        url: `https://cdn.test/${input.objectKey}`,
        size: input.buffer.length,
        checksum: 'etag-123',
      })),
      delete: jest.fn(async () => undefined),
      download: jest.fn(),
      list: jest.fn(async () => ({ objects: [], prefixes: [], cursor: null })),
      getUsage: jest.fn(),
      getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
      getSignedUrl: jest.fn(async () => 'https://cdn.test/signed'),
      createFolder: jest.fn(),
      deleteFolder: jest.fn(),
      move: jest.fn(async (_from: string, to: string) => to),
    } as never

    fileRepository = {
      create: jest.fn((value: any) => Object.assign(new StorageFileEntity(), value)),
      save: jest.fn(async (value: any) => {
        savedFiles.push(value)
        if (!value.id) value.id = savedFiles.length
        return value
      }),
      findOne: jest.fn(async () => null),
      update: jest.fn(async () => undefined),
      softRemove: jest.fn(async (value: any) => value),
      createQueryBuilder: jest.fn(),
    }
    providerRepository = { findOne: jest.fn(async () => makeProvider()), save: jest.fn(async (value: any) => value) }
    providerService = { findProviderOrFail: jest.fn(async () => makeProvider()) }
    folderService = { findFolderOrFail: jest.fn(), ensureFolderByPath: jest.fn() }
    driverFactory = { create: jest.fn(() => driver) }
    router = { route: jest.fn(async () => ({ provider: makeProvider(), strategy: 'most_free', reason: 'ly do', rejected: [] })) }
    referenceService = { findReferences: jest.fn(async () => ({ references: [], total: 0 })), getScannedColumns: jest.fn(() => []) }

    service = new StorageFileService(fileRepository, providerRepository, providerService, folderService, driverFactory, router, referenceService)
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined)
  })

  describe('đặt tên object key khi upload', () => {
    const uploadedKey = async (name: string, provider?: StorageProviderEntity, folder?: StorageFolderEntity) => {
      if (provider) router.route.mockResolvedValue({ provider, strategy: 'most_free', reason: '', rejected: [] })
      if (folder) folderService.findFolderOrFail.mockResolvedValue(folder)

      await service.upload(makeMulterFile(name), folder ? { folder_id: folder.id } : {})
      return driver.upload.mock.calls.at(-1)[0].objectKey
    }

    it('giữ tên gốc và thêm hậu tố duy nhất để không ghi đè nhau', async () => {
      const key = await uploadedKey('bao-cao.pdf')

      expect(key).toMatch(/^bao-cao_\d+_[0-9a-f]{8}\.pdf$/)
    })

    it('bỏ dấu tiếng Việt để key an toàn trên mọi dịch vụ', async () => {
      const key = await uploadedKey('Tài liệu học tập.pdf')

      expect(key).toMatch(/^tai-lieu-hoc-tap_\d+_[0-9a-f]{8}\.pdf$/)
    })

    it('thay ký tự đặc biệt và khoảng trắng bằng dấu gạch ngang', async () => {
      const key = await uploadedKey('file (bản sao) #2 @2026!.png')

      expect(key).toMatch(/^file-ban-sao-2-2026_\d+_[0-9a-f]{8}\.png$/)
    })

    it('xử lý được tên file không có phần mở rộng', async () => {
      const key = await uploadedKey('README')

      expect(key).toMatch(/^readme_\d+_[0-9a-f]{8}$/)
    })

    it('xử lý được tên file chỉ gồm ký tự đặc biệt', async () => {
      const key = await uploadedKey('###.png')

      expect(key).toMatch(/^\d+_[0-9a-f]{8}\.png$/)
    })

    it('cắt tên quá dài để không vượt giới hạn độ dài key của dịch vụ', async () => {
      const key = await uploadedKey(`${'a'.repeat(300)}.png`)

      const base = key.split('_')[0]
      expect(base.length).toBeLessThanOrEqual(80)
    })

    it('ghép tiền tố của dịch vụ vào đầu key', async () => {
      const key = await uploadedKey('anh.png', makeProvider({ path_prefix: 'hvm/2026' }))

      expect(key).toMatch(/^hvm\/2026\/anh_\d+_[0-9a-f]{8}\.png$/)
    })

    it('ghép cả tiền tố dịch vụ và đường dẫn thư mục', async () => {
      const key = await uploadedKey('anh.png', makeProvider({ path_prefix: 'hvm' }), makeFolder({ path: 'bai-viet/2026' }))

      expect(key).toMatch(/^hvm\/bai-viet\/2026\/anh_\d+_[0-9a-f]{8}\.png$/)
    })

    it('hai file cùng tên upload liên tiếp cho ra 2 key khác nhau', async () => {
      const first = await uploadedKey('trung-ten.png')
      const second = await uploadedKey('trung-ten.png')

      expect(first).not.toBe(second)
    })
  })

  describe('upload', () => {
    it('ghi bản ghi index đầy đủ thông tin', async () => {
      const outcome = await service.upload(makeMulterFile('anh.png', 'image/png'), {}, 99)

      expect(outcome.file).toMatchObject({
        provider_id: 1,
        folder_id: null,
        name: 'anh.png',
        extension: 'png',
        mime_type: 'image/png',
        kind: StorageFileKind.IMAGE,
        source: StorageFileSource.UPLOAD,
        uploaded_by: 99,
        checksum: 'etag-123',
      })
      expect(outcome.file.url).toContain('https://cdn.test/')
      expect(outcome.route_reason).toBe('ly do')
    })

    it('tạo thư mục theo đường dẫn trên đúng dịch vụ mà router đã chọn', async () => {
      const chosen = makeProvider({ id: 5, name: 'B2' })
      router.route.mockResolvedValue({ provider: chosen, strategy: 'most_free', reason: '', rejected: [] })
      folderService.ensureFolderByPath.mockResolvedValue(makeFolder({ id: 77, provider_id: 5, path: 'pdf' }))

      await service.upload(makeMulterFile('a.pdf', 'application/pdf'), { folder_path: 'pdf' })

      expect(folderService.ensureFolderByPath).toHaveBeenCalledWith(5, 'pdf')
      expect(savedFiles[0].folder_id).toBe(77)
    })

    it('từ chối khi thư mục được chọn không thuộc dịch vụ sẽ nhận file', async () => {
      folderService.findFolderOrFail.mockResolvedValue(makeFolder({ id: 10, provider_id: 999 }))

      await expect(service.upload(makeMulterFile('a.png'), { folder_id: 10 })).rejects.toThrow()
    })

    it('ưu tiên folder_id khi client gửi cả folder_id và folder_path', async () => {
      folderService.findFolderOrFail.mockResolvedValue(makeFolder({ id: 10, provider_id: 1 }))

      await service.upload(makeMulterFile('a.png'), { folder_id: 10, folder_path: 'bo-qua' })

      expect(folderService.ensureFolderByPath).not.toHaveBeenCalled()
    })

    it('cập nhật dần dung lượng cache để lần chia tải sau không dùng số quá cũ', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider({ usage_bytes: '1000', usage_objects: '5' }))

      await service.upload(makeMulterFile('a.png', 'image/png', 'x'.repeat(500)), {})

      expect(providerRepository.save).toHaveBeenCalledWith(expect.objectContaining({ usage_bytes: '1500', usage_objects: '6' }))
    })

    it('không tự tạo số liệu dung lượng khi chưa từng đo lần nào', async () => {
      providerRepository.findOne.mockResolvedValue(makeProvider({ usage_bytes: null, usage_objects: null }))

      await service.upload(makeMulterFile('a.png'), {})

      expect(providerRepository.save).toHaveBeenCalledWith(expect.objectContaining({ usage_bytes: null, usage_objects: null }))
    })

    it('lỗi khi cập nhật dung lượng không làm upload thất bại', async () => {
      providerRepository.findOne.mockRejectedValue(new Error('DB tam thoi loi'))

      await expect(service.upload(makeMulterFile('a.png'), {})).resolves.toBeDefined()
    })
  })

  describe('uploadMany', () => {
    it('tách riêng file lỗi, các file còn lại vẫn upload bình thường', async () => {
      driver.upload
        .mockResolvedValueOnce({ objectKey: 'ok-1', url: 'u1', size: 1 })
        .mockRejectedValueOnce(new Error('het dung luong'))
        .mockResolvedValueOnce({ objectKey: 'ok-2', url: 'u2', size: 1 })

      const result = await service.uploadMany([makeMulterFile('a.png'), makeMulterFile('b.png'), makeMulterFile('c.png')], {})

      expect(result.uploaded).toHaveLength(2)
      expect(result.errors).toEqual([{ name: 'b.png', message: 'het dung luong' }])
    })
  })

  describe('phân loại file', () => {
    const kindOf = (mime: string, name: string) => service['kindOf'](mime, name)

    it('phân loại theo mime khi dịch vụ trả mime', () => {
      expect(kindOf('image/png', 'a.png')).toBe(StorageFileKind.IMAGE)
      expect(kindOf('video/mp4', 'a.mp4')).toBe(StorageFileKind.VIDEO)
      expect(kindOf('audio/mpeg', 'a.mp3')).toBe(StorageFileKind.AUDIO)
      expect(kindOf('application/pdf', 'a.pdf')).toBe(StorageFileKind.DOCUMENT)
      expect(kindOf('application/zip', 'a.zip')).toBe(StorageFileKind.ARCHIVE)
      expect(kindOf('application/x-thu-gi-do', 'a.bin')).toBe(StorageFileKind.OTHER)
    })

    it('đoán theo phần mở rộng khi dịch vụ không trả mime', () => {
      expect(kindOf('application/octet-stream', 'a.jpg')).toBe(StorageFileKind.IMAGE)
      expect(kindOf('', 'a.heic')).toBe(StorageFileKind.IMAGE)
      expect(kindOf('', 'a.mkv')).toBe(StorageFileKind.VIDEO)
      expect(kindOf('', 'a.flac')).toBe(StorageFileKind.AUDIO)
      expect(kindOf('', 'a.docx')).toBe(StorageFileKind.DOCUMENT)
      expect(kindOf('', 'a.7z')).toBe(StorageFileKind.ARCHIVE)
      expect(kindOf('', 'a.khong-biet')).toBe(StorageFileKind.OTHER)
    })

    it('không phân biệt chữ hoa chữ thường ở phần mở rộng', () => {
      expect(kindOf('', 'ANH.PNG')).toBe(StorageFileKind.IMAGE)
    })

    it('suy được mime từ phần mở rộng cho file quét về', () => {
      expect(service['guessMimeType']('a.png')).toBe('image/png')
      expect(service['guessMimeType']('a.pdf')).toBe('application/pdf')
      expect(service['guessMimeType']('a.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(service['guessMimeType']('a.la-gi-the')).toBe('application/octet-stream')
    })
  })

  describe('xoá file', () => {
    const existingFile = () =>
      Object.assign(new StorageFileEntity(), {
        id: 3,
        provider_id: 1,
        object_key: 'anh.png',
        size_bytes: '500',
      })

    it('chặn xoá khi file đang được dùng ở đâu đó', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      referenceService.findReferences.mockResolvedValue({ references: [{}], total: 1 })

      await expect(service.deleteFile(3)).rejects.toMatchObject({
        response: expect.objectContaining({ data: expect.objectContaining({ reference_count: 1 }) }),
      })
      expect(driver.delete).not.toHaveBeenCalled()
    })

    it('xoá được khi file không còn dùng ở đâu', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())

      await expect(service.deleteFile(3)).resolves.toEqual({ id: 3, deleted: true })
      expect(driver.delete).toHaveBeenCalledWith('anh.png')
      expect(fileRepository.softRemove).toHaveBeenCalled()
    })

    it('force=true thì xoá bất chấp file đang được dùng, và bỏ luôn bước tra cứu', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      referenceService.findReferences.mockResolvedValue({ references: [{}], total: 5 })

      await expect(service.deleteFile(3, true)).resolves.toEqual({ id: 3, deleted: true })
      expect(referenceService.findReferences).not.toHaveBeenCalled()
    })

    it('trừ lại dung lượng cache sau khi xoá', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      providerRepository.findOne.mockResolvedValue(makeProvider({ usage_bytes: '2000', usage_objects: '10' }))

      await service.deleteFile(3)

      expect(providerRepository.save).toHaveBeenCalledWith(expect.objectContaining({ usage_bytes: '1500', usage_objects: '9' }))
    })

    it('không cho dung lượng cache xuống số âm', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      providerRepository.findOne.mockResolvedValue(makeProvider({ usage_bytes: '100', usage_objects: '0' }))

      await service.deleteFile(3)

      expect(providerRepository.save).toHaveBeenCalledWith(expect.objectContaining({ usage_bytes: '0', usage_objects: '0' }))
    })

    it('báo lỗi khi file không tồn tại', async () => {
      fileRepository.findOne.mockResolvedValue(null)

      await expect(service.deleteFile(999)).rejects.toThrow()
    })
  })

  describe('bulkDelete', () => {
    it('xoá được cái nào thì xoá, cái nào vướng thì báo lý do', async () => {
      jest
        .spyOn(service, 'deleteFile')
        .mockResolvedValueOnce({ id: 1, deleted: true })
        .mockRejectedValueOnce(new Error('dang duoc dung'))
        .mockResolvedValueOnce({ id: 3, deleted: true })

      const result = await service.bulkDelete({ ids: [1, 2, 3] })

      expect(result).toEqual({
        deleted: [1, 3],
        skipped: [{ id: 2, reason: 'dang duoc dung' }],
        deleted_count: 2,
        skipped_count: 1,
      })
    })

    it('truyền tiếp cờ force xuống từng file', async () => {
      const deleteFile = jest.spyOn(service, 'deleteFile').mockResolvedValue({ id: 1, deleted: true })

      await service.bulkDelete({ ids: [1], force: true })

      expect(deleteFile).toHaveBeenCalledWith(1, true)
    })
  })

  describe('đổi tên và di chuyển', () => {
    const existingFile = () =>
      Object.assign(new StorageFileEntity(), {
        id: 3,
        provider_id: 1,
        folder_id: null,
        object_key: 'hvm/anh-cu.png',
        name: 'anh-cu.png',
        url: 'https://cdn.test/hvm/anh-cu.png',
      })

    it('đổi tên giữ nguyên thư mục chứa file', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())

      const result = await service.renameFile(3, { name: 'anh-moi.png' })

      expect(driver.move).toHaveBeenCalledWith('hvm/anh-cu.png', 'hvm/anh-moi.png')
      expect(result.name).toBe('anh-moi.png')
      expect(result.url).toBe('https://cdn.test/hvm/anh-moi.png')
    })

    it('chặn tên file chứa dấu / để không leo ra thư mục khác', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())

      await service.renameFile(3, { name: '../../ten-xau.png' })

      // Dấu / và dấu chấm đầu bị loại, chỉ còn phần tên
      expect(driver.move).toHaveBeenCalledWith('hvm/anh-cu.png', 'hvm/ten-xau.png')
    })

    it('báo lỗi khi dịch vụ không hỗ trợ đổi tên', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      driver.capabilities.move = false

      await expect(service.renameFile(3, { name: 'moi.png' })).rejects.toThrow()
    })

    it('không làm gì khi tên mới trùng tên cũ', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())

      await service.renameFile(3, { name: 'anh-cu.png' })

      expect(driver.move).not.toHaveBeenCalled()
    })

    it('di chuyển file sang thư mục khác, giữ nguyên tên file', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))
      folderService.findFolderOrFail.mockResolvedValue(makeFolder({ id: 20, provider_id: 1, path: 'bai-viet' }))

      const result = await service.moveFile(3, { folder_id: 20 })

      expect(driver.move).toHaveBeenCalledWith('hvm/anh-cu.png', 'hvm/bai-viet/anh-cu.png')
      expect(result.folder_id).toBe(20)
    })

    it('chuyển về thư mục gốc khi không truyền folder_id', async () => {
      const file = existingFile()
      file.folder_id = 20
      fileRepository.findOne.mockResolvedValue(file)
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))

      const result = await service.moveFile(3, {})

      expect(driver.move).toHaveBeenCalledWith('hvm/anh-cu.png', 'hvm/anh-cu.png')
      expect(result.folder_id).toBeNull()
    })

    it('chặn di chuyển sang thư mục của dịch vụ khác', async () => {
      fileRepository.findOne.mockResolvedValue(existingFile())
      folderService.findFolderOrFail.mockResolvedValue(makeFolder({ id: 20, provider_id: 999 }))

      await expect(service.moveFile(3, { folder_id: 20 })).rejects.toThrow()
    })

    it('không làm gì khi file đã ở đúng thư mục đích', async () => {
      const file = existingFile()
      file.folder_id = 20
      fileRepository.findOne.mockResolvedValue(file)
      folderService.findFolderOrFail.mockResolvedValue(makeFolder({ id: 20, provider_id: 1 }))

      await service.moveFile(3, { folder_id: 20 })

      expect(driver.move).not.toHaveBeenCalled()
    })
  })

  describe('getSignedUrl', () => {
    it('trả link có hạn khi dịch vụ hỗ trợ', async () => {
      fileRepository.findOne.mockResolvedValue(
        Object.assign(new StorageFileEntity(), { id: 3, provider_id: 1, object_key: 'a.png', url: 'https://cdn/a.png' }),
      )

      expect(await service.getSignedUrl(3, 600)).toEqual({
        url: 'https://cdn.test/signed',
        signed: true,
        expires_in: 600,
      })
    })

    it('rơi về URL công khai khi dịch vụ không hỗ trợ link có hạn', async () => {
      fileRepository.findOne.mockResolvedValue(
        Object.assign(new StorageFileEntity(), { id: 3, provider_id: 1, object_key: 'a.png', url: 'https://cdn/a.png' }),
      )
      driver.getSignedUrl.mockResolvedValue(null)

      expect(await service.getSignedUrl(3)).toEqual({ url: 'https://cdn/a.png', signed: false, expires_in: null })
    })
  })

  describe('scanProvider - quét file có sẵn trên dịch vụ', () => {
    it('đưa file chưa có trong danh mục vào index', async () => {
      driver.list.mockResolvedValue({
        objects: [
          { objectKey: 'cu-1.png', name: 'cu-1.png', size: 100, url: 'https://cdn/cu-1.png' },
          { objectKey: 'cu-2.pdf', name: 'cu-2.pdf', size: 200, url: 'https://cdn/cu-2.pdf' },
        ],
        prefixes: [],
        cursor: null,
      })

      const result = await service.scanProvider(1, {})

      expect(result).toMatchObject({ scanned: 2, imported: 2, updated: 0, truncated: false })
      expect(savedFiles[0]).toMatchObject({ source: StorageFileSource.SCAN, kind: StorageFileKind.IMAGE })
      expect(savedFiles[1]).toMatchObject({ kind: StorageFileKind.DOCUMENT, mime_type: 'application/pdf' })
    })

    it('bỏ qua file đã có trong danh mục và không đổi gì', async () => {
      driver.list.mockResolvedValue({
        objects: [{ objectKey: 'da-co.png', name: 'da-co.png', size: 100, checksum: 'etag-1' }],
        prefixes: [],
        cursor: null,
      })
      fileRepository.findOne.mockResolvedValue(
        Object.assign(new StorageFileEntity(), {
          id: 1,
          provider_id: 1,
          object_key: 'da-co.png',
          size_bytes: '100',
          checksum: 'etag-1',
          folder_id: null,
          deleted_at: null,
        }),
      )

      const result = await service.scanProvider(1, {})

      expect(result).toMatchObject({ scanned: 1, imported: 0, updated: 0 })
      expect(fileRepository.save).not.toHaveBeenCalled()
    })

    it('cập nhật lại khi file trên dịch vụ đã thay đổi kích thước', async () => {
      driver.list.mockResolvedValue({
        objects: [{ objectKey: 'doi-roi.png', name: 'doi-roi.png', size: 999 }],
        prefixes: [],
        cursor: null,
      })
      fileRepository.findOne.mockResolvedValue(
        Object.assign(new StorageFileEntity(), {
          id: 1,
          provider_id: 1,
          object_key: 'doi-roi.png',
          size_bytes: '100',
          folder_id: null,
          deleted_at: null,
        }),
      )

      const result = await service.scanProvider(1, {})

      expect(result).toMatchObject({ imported: 0, updated: 1 })
      expect(savedFiles[0].size_bytes).toBe('999')
    })

    it('hồi sinh bản ghi đã xoá mềm khi file vẫn còn trên dịch vụ', async () => {
      driver.list.mockResolvedValue({
        objects: [{ objectKey: 'quay-lai.png', name: 'quay-lai.png', size: 100 }],
        prefixes: [],
        cursor: null,
      })
      fileRepository.findOne.mockResolvedValue(
        Object.assign(new StorageFileEntity(), {
          id: 1,
          provider_id: 1,
          object_key: 'quay-lai.png',
          size_bytes: '100',
          folder_id: null,
          deleted_at: new Date(),
        }),
      )

      const result = await service.scanProvider(1, {})

      expect(result.updated).toBe(1)
      expect(savedFiles[0].deleted_at).toBeNull()
    })

    it('tạo thư mục trong danh mục theo prefix của key trên dịch vụ', async () => {
      driver.list.mockResolvedValue({
        objects: [{ objectKey: 'bai-viet/2026/anh.png', name: 'anh.png', size: 100 }],
        prefixes: [],
        cursor: null,
      })
      folderService.ensureFolderByPath.mockResolvedValue(makeFolder({ id: 55, path: 'bai-viet/2026' }))

      await service.scanProvider(1, {})

      expect(folderService.ensureFolderByPath).toHaveBeenCalledWith(1, 'bai-viet/2026')
      expect(savedFiles[0].folder_id).toBe(55)
    })

    it('bỏ tiền tố của dịch vụ khi suy ra thư mục, để cây thư mục không bị lồng thêm một cấp', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))
      driver.list.mockResolvedValue({
        objects: [{ objectKey: 'hvm/bai-viet/anh.png', name: 'anh.png', size: 100 }],
        prefixes: [],
        cursor: null,
      })

      await service.scanProvider(1, {})

      expect(folderService.ensureFolderByPath).toHaveBeenCalledWith(1, 'bai-viet')
    })

    it('đi vào thư mục con khi bật recursive', async () => {
      driver.list
        .mockResolvedValueOnce({ objects: [], prefixes: ['con'], cursor: null })
        .mockResolvedValueOnce({ objects: [{ objectKey: 'con/a.png', name: 'a.png', size: 1 }], prefixes: [], cursor: null })

      const result = await service.scanProvider(1, { recursive: true })

      expect(result.scanned).toBe(1)
      expect(driver.list).toHaveBeenCalledTimes(2)
    })

    it('không đi vào thư mục con khi tắt recursive', async () => {
      driver.list.mockResolvedValue({ objects: [], prefixes: ['con'], cursor: null })

      await service.scanProvider(1, { recursive: false })

      expect(driver.list).toHaveBeenCalledTimes(1)
    })

    it('theo con trỏ phân trang của dịch vụ', async () => {
      driver.list
        .mockResolvedValueOnce({
          objects: [{ objectKey: 'a.png', name: 'a.png', size: 1 }],
          prefixes: [],
          cursor: 'trang-2',
        })
        .mockResolvedValueOnce({ objects: [{ objectKey: 'b.png', name: 'b.png', size: 1 }], prefixes: [], cursor: null })

      const result = await service.scanProvider(1, {})

      expect(result.scanned).toBe(2)
    })

    it('dừng ở giới hạn và báo truncated để biết còn file chưa quét', async () => {
      driver.list.mockResolvedValue({
        objects: Array.from({ length: 10 }, (_, index) => ({
          objectKey: `f-${index}.png`,
          name: `f-${index}.png`,
          size: 1,
        })),
        prefixes: [],
        cursor: 'con-nua',
      })

      const result = await service.scanProvider(1, { limit: 5 })

      expect(result.scanned).toBe(5)
      expect(result.truncated).toBe(true)
    })

    it('báo lỗi khi dịch vụ không hỗ trợ liệt kê file', async () => {
      driver.capabilities.listing = false

      await expect(service.scanProvider(1, {})).rejects.toThrow()
    })
  })
})
