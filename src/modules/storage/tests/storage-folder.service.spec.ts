import { StorageDriver } from '@enums/storage.enum'
import { IStorageDriver } from '../drivers/storage-driver.interface'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageFolderService } from '../services/storage-folder.service'

const makeProvider = (overrides: Partial<StorageProviderEntity> = {}): StorageProviderEntity =>
  Object.assign(new StorageProviderEntity(), { id: 1, name: 'R2', driver: StorageDriver.S3, path_prefix: null, ...overrides })

const makeFolder = (overrides: Partial<StorageFolderEntity> = {}): StorageFolderEntity =>
  Object.assign(new StorageFolderEntity(), { id: 1, provider_id: 1, parent_id: null, name: 'anh', path: 'anh', ...overrides })

describe('StorageFolderService', () => {
  let service: StorageFolderService
  let folderRepository: any
  let fileRepository: any
  let providerService: any
  let driverFactory: any
  let driver: jest.Mocked<IStorageDriver>
  let savedFolders: StorageFolderEntity[]

  const makeQueryBuilder = (result: StorageFolderEntity[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => result),
  })

  beforeEach(() => {
    savedFolders = []

    driver = {
      capabilities: { quotaApi: false, listing: true, signedUrl: true, publicUrl: true, realFolders: false, move: true },
      createFolder: jest.fn(async () => null),
      deleteFolder: jest.fn(async () => undefined),
      move: jest.fn(async (_from: string, to: string) => to),
      getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
    } as never

    folderRepository = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      create: jest.fn((value: any) => Object.assign(new StorageFolderEntity(), value)),
      save: jest.fn(async (value: any) => {
        savedFolders.push(value)
        if (!value.id) value.id = savedFolders.length + 100
        return value
      }),
      softRemove: jest.fn(async (value: any) => value),
      createQueryBuilder: jest.fn(() => makeQueryBuilder([])),
    }
    fileRepository = {
      find: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      save: jest.fn(async (value: any) => value),
      softDelete: jest.fn(async () => undefined),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => []),
      })),
    }
    providerService = { findProviderOrFail: jest.fn(async () => makeProvider()) }
    driverFactory = { create: jest.fn(() => driver) }

    service = new StorageFolderService(folderRepository, fileRepository, providerService, driverFactory)
  })

  describe('createFolder', () => {
    it('tạo thư mục ở gốc với path bằng chính tên', async () => {
      const folder = await service.createFolder({ provider_id: 1, name: 'bai-viet' })

      expect(folder).toMatchObject({ provider_id: 1, parent_id: null, name: 'bai-viet', path: 'bai-viet' })
    })

    it('ghép path từ thư mục cha', async () => {
      folderRepository.findOne.mockResolvedValueOnce(makeFolder({ id: 5, path: 'bai-viet' })).mockResolvedValueOnce(null)

      const folder = await service.createFolder({ provider_id: 1, name: '2026', parent_id: 5 })

      expect(folder).toMatchObject({ parent_id: 5, path: 'bai-viet/2026' })
    })

    it('gọi driver tạo thư mục kèm tiền tố của dịch vụ', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))

      await service.createFolder({ provider_id: 1, name: 'bai-viet' })

      expect(driver.createFolder).toHaveBeenCalledWith('hvm/bai-viet')
    })

    it('lưu remote_id do dịch vụ cấp, để sau này xoá đúng thư mục', async () => {
      // Google Drive và OneDrive định danh thư mục bằng id, không bằng path
      driver.createFolder.mockResolvedValue('drive-folder-id-123')

      const folder = await service.createFolder({ provider_id: 1, name: 'anh' })

      expect(folder.remote_id).toBe('drive-folder-id-123')
    })

    it('từ chối khi thư mục đã tồn tại', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder({ path: 'bai-viet' }))

      await expect(service.createFolder({ provider_id: 1, name: 'bai-viet' })).rejects.toThrow()
    })

    it('từ chối khi thư mục cha thuộc dịch vụ khác', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder({ id: 5, provider_id: 999 }))

      await expect(service.createFolder({ provider_id: 1, name: 'x', parent_id: 5 })).rejects.toThrow()
    })

    const unsafeNames: [string, string][] = [
      ['../vuot-ra', 'vuot-ra'],
      ['thu/muc', 'thumuc'],
      ['thu\\muc', 'thumuc'],
      ['...an', 'an'],
      ['  co-khoang-trang  ', 'co-khoang-trang'],
    ]

    it.each(unsafeNames)('làm sạch tên "%s" thành "%s"', async (input, expected) => {
      const folder = await service.createFolder({ provider_id: 1, name: input })

      expect(folder.name).toBe(expected)
    })

    it('từ chối tên rỗng sau khi làm sạch', async () => {
      await expect(service.createFolder({ provider_id: 1, name: '../..' })).rejects.toThrow()
      await expect(service.createFolder({ provider_id: 1, name: '///' })).rejects.toThrow()
    })
  })

  describe('renameFolder', () => {
    it('cập nhật path của chính nó và toàn bộ cây con', async () => {
      const target = makeFolder({ id: 1, name: 'cu', path: 'cu' })
      const child = makeFolder({ id: 2, name: '2026', path: 'cu/2026', parent_id: 1 })
      const grandChild = makeFolder({ id: 3, name: 'anh', path: 'cu/2026/anh', parent_id: 2 })

      folderRepository.findOne.mockResolvedValueOnce(target).mockResolvedValueOnce(null)
      folderRepository.createQueryBuilder.mockReturnValue(makeQueryBuilder([child, grandChild]))

      await service.renameFolder(1, { name: 'ten-moi-dai-hon' })

      expect(target.path).toBe('ten-moi-dai-hon')
      // Phải cắt theo path CŨ, nếu cắt theo path mới thì độ dài khác nhau sẽ ra path sai
      expect(child.path).toBe('ten-moi-dai-hon/2026')
      expect(grandChild.path).toBe('ten-moi-dai-hon/2026/anh')
    })

    it('cắt path đúng cả khi tên mới ngắn hơn tên cũ', async () => {
      const target = makeFolder({ id: 1, name: 'ten-rat-dai-ban-dau', path: 'ten-rat-dai-ban-dau' })
      const child = makeFolder({ id: 2, path: 'ten-rat-dai-ban-dau/con', parent_id: 1 })

      folderRepository.findOne.mockResolvedValueOnce(target).mockResolvedValueOnce(null)
      folderRepository.createQueryBuilder.mockReturnValue(makeQueryBuilder([child]))

      await service.renameFolder(1, { name: 'a' })

      expect(child.path).toBe('a/con')
    })

    it('di chuyển file bên trong sang key mới trên dịch vụ', async () => {
      const target = makeFolder({ id: 1, name: 'cu', path: 'cu' })
      folderRepository.findOne.mockResolvedValueOnce(target).mockResolvedValueOnce(null)
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))
      fileRepository.find.mockResolvedValue([
        Object.assign(new StorageFileEntity(), { id: 1, object_key: 'hvm/cu/anh.png', url: 'https://cdn.test/hvm/cu/anh.png' }),
      ])

      await service.renameFolder(1, { name: 'moi' })

      expect(driver.move).toHaveBeenCalledWith('hvm/cu/anh.png', 'hvm/moi/anh.png')
      expect(fileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ object_key: 'hvm/moi/anh.png', url: 'https://cdn.test/hvm/moi/anh.png' }),
      )
    })

    it('không di chuyển file khi dịch vụ không hỗ trợ, index vẫn đúng vì key cũ không đổi', async () => {
      const target = makeFolder({ id: 1, name: 'cu', path: 'cu' })
      folderRepository.findOne.mockResolvedValueOnce(target).mockResolvedValueOnce(null)
      driver.capabilities.move = false
      fileRepository.find.mockResolvedValue([Object.assign(new StorageFileEntity(), { id: 1, object_key: 'cu/anh.png' })])

      await service.renameFolder(1, { name: 'moi' })

      expect(driver.move).not.toHaveBeenCalled()
      expect(target.path).toBe('moi')
    })

    it('từ chối khi đã có thư mục cùng tên ở cùng cấp', async () => {
      folderRepository.findOne
        .mockResolvedValueOnce(makeFolder({ id: 1, name: 'cu', path: 'cu' }))
        .mockResolvedValueOnce(makeFolder({ id: 9, path: 'moi' }))

      await expect(service.renameFolder(1, { name: 'moi' })).rejects.toThrow()
    })

    it('không làm gì khi tên mới trùng tên cũ', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder({ id: 1, name: 'giu-nguyen', path: 'giu-nguyen' }))

      await service.renameFolder(1, { name: 'giu-nguyen' })

      expect(folderRepository.save).not.toHaveBeenCalled()
    })

    it('đổi tên thư mục con giữ nguyên đường dẫn của thư mục cha', async () => {
      const target = makeFolder({ id: 2, name: 'cu', path: 'cha/cu', parent_id: 1 })
      folderRepository.findOne.mockResolvedValueOnce(target).mockResolvedValueOnce(null)

      await service.renameFolder(2, { name: 'moi' })

      expect(target.path).toBe('cha/moi')
    })
  })

  describe('deleteFolder', () => {
    it('chặn xoá thư mục còn nội dung khi không truyền force', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder())
      fileRepository.count.mockResolvedValue(7)

      await expect(service.deleteFolder(1)).rejects.toMatchObject({
        response: expect.objectContaining({ data: expect.objectContaining({ file_count: 7 }) }),
      })
      expect(driver.deleteFolder).not.toHaveBeenCalled()
    })

    it('xoá được thư mục rỗng', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder())

      const result = await service.deleteFolder(1)

      expect(result).toMatchObject({ id: 1, deleted: true, deleted_files: 0 })
      expect(driver.deleteFolder).toHaveBeenCalled()
      expect(folderRepository.softRemove).toHaveBeenCalled()
    })

    it('force thì xoá cả file và thư mục con bên trong', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder({ id: 1, path: 'xoa' }))
      folderRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([makeFolder({ id: 2, path: 'xoa/con' }), makeFolder({ id: 3, path: 'xoa/con/sau' })]),
      )
      fileRepository.count.mockResolvedValue(5)

      const result = await service.deleteFolder(1, true)

      expect(result).toMatchObject({ deleted_files: 5, deleted_folders: 2 })
      // Index phải được dọn cho cả thư mục gốc và từng thư mục con
      expect(fileRepository.softDelete).toHaveBeenCalledTimes(3)
      expect(folderRepository.softRemove).toHaveBeenCalledTimes(3)
    })

    it('truyền remote_id cho driver, để Drive/OneDrive xoá đúng thư mục', async () => {
      folderRepository.findOne.mockResolvedValue(makeFolder({ path: 'anh', remote_id: 'drive-id-1' }))

      await service.deleteFolder(1)

      expect(driver.deleteFolder).toHaveBeenCalledWith('anh', 'drive-id-1')
    })

    it('ghép tiền tố dịch vụ vào đường dẫn khi xoá', async () => {
      providerService.findProviderOrFail.mockResolvedValue(makeProvider({ path_prefix: 'hvm' }))
      folderRepository.findOne.mockResolvedValue(makeFolder({ path: 'anh' }))

      await service.deleteFolder(1)

      expect(driver.deleteFolder).toHaveBeenCalledWith('hvm/anh', undefined)
    })
  })

  describe('ensureFolderByPath', () => {
    it('tạo lần lượt từng cấp của đường dẫn', async () => {
      const folder = await service.ensureFolderByPath(1, 'bai-viet/2026/anh')

      expect(savedFolders.map(item => item.path)).toEqual(['bai-viet', 'bai-viet/2026', 'bai-viet/2026/anh'])
      // Cấp sau phải trỏ parent về cấp trước
      expect(savedFolders[1].parent_id).toBe(savedFolders[0].id)
      expect(folder.path).toBe('bai-viet/2026/anh')
    })

    it('dùng lại thư mục đã có, không tạo trùng', async () => {
      folderRepository.findOne.mockImplementation(async ({ where }: any) =>
        where.path === 'bai-viet' ? makeFolder({ id: 50, path: 'bai-viet' }) : null,
      )

      await service.ensureFolderByPath(1, 'bai-viet/2026')

      expect(savedFolders).toHaveLength(1)
      expect(savedFolders[0]).toMatchObject({ path: 'bai-viet/2026', parent_id: 50 })
    })

    it('trả null với đường dẫn rỗng, nghĩa là file nằm ở thư mục gốc', async () => {
      expect(await service.ensureFolderByPath(1, '')).toBeNull()
      expect(await service.ensureFolderByPath(1, '///')).toBeNull()
      expect(await service.ensureFolderByPath(1, null)).toBeNull()
    })

    it('bỏ dấu / ở hai đầu và các đoạn rỗng ở giữa', async () => {
      await service.ensureFolderByPath(1, '/bai-viet//2026/')

      expect(savedFolders.map(item => item.path)).toEqual(['bai-viet', 'bai-viet/2026'])
    })
  })

  describe('getFolderTree', () => {
    it('dựng cây lồng nhau kèm số file và dung lượng từng thư mục', async () => {
      folderRepository.find.mockResolvedValue([
        makeFolder({ id: 1, name: 'bai-viet', path: 'bai-viet', parent_id: null }),
        makeFolder({ id: 2, name: '2026', path: 'bai-viet/2026', parent_id: 1 }),
        makeFolder({ id: 3, name: 'anh', path: 'anh', parent_id: null }),
      ])
      fileRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => [
          { folder_id: 2, file_count: '5', size_bytes: '5000' },
          // folder_id null là file nằm ở thư mục gốc
          { folder_id: null, file_count: '2', size_bytes: '200' },
        ]),
      })

      const tree = await service.getFolderTree(1)

      expect(tree.folders).toHaveLength(2)
      expect(tree.folders[0]).toMatchObject({ id: 1, name: 'bai-viet', file_count: 0 })
      expect(tree.folders[0].children[0]).toMatchObject({ id: 2, file_count: 5, size_bytes: 5000 })
      expect(tree.root).toEqual({ file_count: 2, size_bytes: 200 })
    })

    it('dịch vụ chưa có thư mục nào thì trả cây rỗng', async () => {
      const tree = await service.getFolderTree(1)

      expect(tree).toEqual({ provider_id: 1, root: { file_count: 0, size_bytes: 0 }, folders: [] })
    })
  })

  describe('findFolderOrFail', () => {
    it('báo lỗi khi thư mục không tồn tại', async () => {
      await expect(service.findFolderOrFail(999)).rejects.toThrow()
    })
  })
})
