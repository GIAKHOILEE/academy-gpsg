import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateStorageFolderDto, RenameStorageFolderDto } from '../dtos/storage-file.dto'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageDriverFactory } from './storage-driver.factory'
import { StorageProviderService } from './storage-provider.service'

/** Một nút trong cây thư mục trả về cho UI. */
export interface StorageFolderNode {
  id: number
  name: string
  path: string
  parent_id: number | null
  file_count: number
  size_bytes: number
  children: StorageFolderNode[]
}

@Injectable()
export class StorageFolderService {
  constructor(
    @InjectRepository(StorageFolderEntity)
    private readonly folderRepository: Repository<StorageFolderEntity>,
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
    private readonly providerService: StorageProviderService,
    private readonly driverFactory: StorageDriverFactory,
  ) {}

  /** Cây thư mục của một dịch vụ, kèm số file và tổng dung lượng mỗi thư mục. */
  async getFolderTree(providerId: number) {
    await this.providerService.findProviderOrFail(providerId)

    const folders = await this.folderRepository.find({
      where: { provider_id: providerId },
      order: { path: 'ASC' },
    })

    // Đếm file theo thư mục bằng 1 query thay vì N query
    const counts = await this.fileRepository
      .createQueryBuilder('file')
      .select('file.folder_id', 'folder_id')
      .addSelect('COUNT(file.id)', 'file_count')
      .addSelect('COALESCE(SUM(file.size_bytes), 0)', 'size_bytes')
      .where('file.provider_id = :providerId', { providerId })
      .groupBy('file.folder_id')
      .getRawMany<{ folder_id: number | null; file_count: string; size_bytes: string }>()

    const statsByFolder = new Map(
      counts.map(row => [
        row.folder_id === null ? 0 : Number(row.folder_id),
        { file_count: Number(row.file_count), size_bytes: Number(row.size_bytes) },
      ]),
    )

    const nodeById = new Map<number, StorageFolderNode>()
    for (const folder of folders) {
      nodeById.set(folder.id, {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parent_id: folder.parent_id ?? null,
        file_count: statsByFolder.get(folder.id)?.file_count || 0,
        size_bytes: statsByFolder.get(folder.id)?.size_bytes || 0,
        children: [],
      })
    }

    const roots: StorageFolderNode[] = []
    for (const folder of folders) {
      const node = nodeById.get(folder.id)
      const parent = folder.parent_id ? nodeById.get(folder.parent_id) : null
      if (parent) parent.children.push(node)
      else roots.push(node)
    }

    const rootStats = statsByFolder.get(0) || { file_count: 0, size_bytes: 0 }

    return {
      provider_id: providerId,
      root: { file_count: rootStats.file_count, size_bytes: rootStats.size_bytes },
      folders: roots,
    }
  }

  async createFolder(dto: CreateStorageFolderDto) {
    const provider = await this.providerService.findProviderOrFail(dto.provider_id)
    const name = this.sanitizeName(dto.name)

    const parent = dto.parent_id ? await this.findFolderOrFail(dto.parent_id) : null
    if (parent && parent.provider_id !== dto.provider_id) {
      throwAppException('STORAGE_FOLDER_NOT_FOUND', ErrorCode.STORAGE_FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const path = parent ? `${parent.path}/${name}` : name

    const existing = await this.folderRepository.findOne({ where: { provider_id: dto.provider_id, path } })
    if (existing) {
      throwAppException('STORAGE_FOLDER_ALREADY_EXISTS', ErrorCode.STORAGE_FOLDER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    // Với dịch vụ có thư mục thật (Local, Drive, Dropbox, OneDrive) thì tạo luôn
    // trên dịch vụ. Với S3/Azure, thư mục chỉ là prefix nên driver trả null.
    const driver = this.driverFactory.create(provider)
    const remoteId = await driver.createFolder(this.withPathPrefix(provider.path_prefix, path))

    const folder = await this.folderRepository.save(
      this.folderRepository.create({
        provider_id: dto.provider_id,
        parent_id: parent?.id ?? null,
        name,
        path,
        remote_id: remoteId,
      }),
    )

    return folder
  }

  async renameFolder(id: number, dto: RenameStorageFolderDto) {
    const folder = await this.findFolderOrFail(id)
    const provider = await this.providerService.findProviderOrFail(folder.provider_id)
    const newName = this.sanitizeName(dto.name)

    if (newName === folder.name) return folder

    // Giữ path cũ lại: nó là mốc để cắt lại path của toàn bộ cây con bên dưới
    const oldPath = folder.path
    const parentPath = folder.path.split('/').slice(0, -1).join('/')
    const newPath = parentPath ? `${parentPath}/${newName}` : newName

    const conflict = await this.folderRepository.findOne({ where: { provider_id: folder.provider_id, path: newPath } })
    if (conflict) {
      throwAppException('STORAGE_FOLDER_ALREADY_EXISTS', ErrorCode.STORAGE_FOLDER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const driver = this.driverFactory.create(provider)
    const prefix = provider.path_prefix

    // Lấy toàn bộ cây con trước, vì đổi tên thư mục cha là đổi path của tất cả bên dưới
    const descendants = await this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.provider_id = :providerId', { providerId: folder.provider_id })
      .andWhere('folder.path LIKE :pattern', { pattern: `${folder.path}/%` })
      .getMany()

    const affectedFolderIds = [folder.id, ...descendants.map(item => item.id)]
    const files = await this.fileRepository.find({
      where: affectedFolderIds.map(folderId => ({ provider_id: folder.provider_id, folder_id: folderId })),
    })

    // Di chuyển từng file trên dịch vụ. Dịch vụ không hỗ trợ move thì bỏ qua -
    // index vẫn đúng vì object_key cũ không đổi.
    if (driver.capabilities.move) {
      for (const file of files) {
        const oldKey = file.object_key
        const newKey = oldKey.replace(this.withPathPrefix(prefix, oldPath), this.withPathPrefix(prefix, newPath))
        if (newKey === oldKey) continue

        const resultKey = await driver.move(oldKey, newKey)
        file.object_key = resultKey
        file.url = driver.getPublicUrl(resultKey) ?? file.url
        await this.fileRepository.save(file)
      }
    }

    // Cập nhật path của chính nó và toàn bộ cây con
    folder.name = newName
    folder.path = newPath
    await this.folderRepository.save(folder)

    for (const descendant of descendants) {
      descendant.path = `${newPath}${descendant.path.slice(oldPath.length)}`
      await this.folderRepository.save(descendant)
    }

    return folder
  }

  /**
   * Xoá thư mục. Mặc định chỉ cho xoá thư mục rỗng để tránh mất file ngoài ý muốn;
   * `force` thì xoá cả nội dung bên trong, cả trên dịch vụ lẫn trong index.
   */
  async deleteFolder(id: number, force = false) {
    const folder = await this.findFolderOrFail(id)
    const provider = await this.providerService.findProviderOrFail(folder.provider_id)

    const descendants = await this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.provider_id = :providerId', { providerId: folder.provider_id })
      .andWhere('folder.path LIKE :pattern', { pattern: `${folder.path}/%` })
      .getMany()

    const affectedFolderIds = [folder.id, ...descendants.map(item => item.id)]
    const fileCount = await this.fileRepository.count({
      where: affectedFolderIds.map(folderId => ({ provider_id: folder.provider_id, folder_id: folderId })),
    })

    if (fileCount > 0 && !force) {
      throwAppException('STORAGE_FOLDER_NOT_EMPTY', ErrorCode.STORAGE_FOLDER_NOT_EMPTY, HttpStatus.BAD_REQUEST, {
        file_count: fileCount,
        folder_count: descendants.length,
      })
    }

    const driver = this.driverFactory.create(provider)
    await driver.deleteFolder(this.withPathPrefix(provider.path_prefix, folder.path), folder.remote_id)

    // Dọn index: file trước, rồi thư mục con, rồi chính nó
    for (const folderId of affectedFolderIds) {
      await this.fileRepository.softDelete({ provider_id: folder.provider_id, folder_id: folderId })
    }

    for (const descendant of descendants) await this.folderRepository.softRemove(descendant)
    await this.folderRepository.softRemove(folder)

    return { id, deleted: true, deleted_files: fileCount, deleted_folders: descendants.length }
  }

  async findFolderOrFail(id: number): Promise<StorageFolderEntity> {
    const folder = await this.folderRepository.findOne({ where: { id } })
    if (!folder) {
      throwAppException('STORAGE_FOLDER_NOT_FOUND', ErrorCode.STORAGE_FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return folder
  }

  /**
   * Tìm hoặc tạo thư mục theo path. Dùng khi quét file từ dịch vụ về index:
   * prefix trên dịch vụ cần được biểu diễn thành thư mục trong trình quản lý.
   */
  async ensureFolderByPath(providerId: number, path: string): Promise<StorageFolderEntity | null> {
    const cleaned = (path || '').replace(/^\/+|\/+$/g, '')
    if (!cleaned) return null

    const segments = cleaned.split('/').filter(Boolean)
    let parent: StorageFolderEntity | null = null
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = await this.folderRepository.findOne({ where: { provider_id: providerId, path: currentPath } })
      if (!folder) {
        folder = await this.folderRepository.save(
          this.folderRepository.create({
            provider_id: providerId,
            parent_id: parent?.id ?? null,
            name: segment,
            path: currentPath,
          }),
        )
      }
      parent = folder
    }

    return parent
  }

  /* ------------------------------ private ------------------------------ */

  /** Chặn tên thư mục chứa dấu / hay .. để không leo ra ngoài phạm vi. */
  private sanitizeName(name: string): string {
    const cleaned = String(name || '')
      .replace(/[/\\]/g, '')
      .replace(/^\.+/, '')
      .trim()

    if (!cleaned) {
      throwAppException('STORAGE_FOLDER_NOT_FOUND', ErrorCode.STORAGE_FOLDER_NOT_FOUND, HttpStatus.BAD_REQUEST)
    }
    return cleaned
  }

  private withPathPrefix(prefix: string | null, path: string): string {
    return [prefix, path].filter(Boolean).join('/')
  }
}
