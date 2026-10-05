import { paginate } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { StorageFileKind, StorageFileSource } from '@enums/storage.enum'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import * as path from 'path'
import { Repository } from 'typeorm'
import {
  BulkDeleteStorageFileDto,
  MoveStorageFileDto,
  PaginateStorageFileDto,
  RenameStorageFileDto,
  ScanStorageProviderDto,
  UploadStorageFileDto,
} from '../dtos/storage-file.dto'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { ARCHIVE_MIMES, DOCUMENT_MIMES } from '../storage.constants'
import { StorageDriverFactory } from './storage-driver.factory'
import { StorageFolderService } from './storage-folder.service'
import { StorageProviderService } from './storage-provider.service'
import { StorageReferenceService } from './storage-reference.service'
import { StorageRouterService } from './storage-router.service'

export interface StorageUploadOutcome {
  file: StorageFileEntity
  provider: { id: number; name: string; driver: string }
  /** Vì sao file đi vào dịch vụ này - hiển thị cho người dùng và để debug. */
  route_reason: string
}

@Injectable()
export class StorageFileService {
  private readonly logger = new Logger(StorageFileService.name)

  constructor(
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
    @InjectRepository(StorageProviderEntity)
    private readonly providerRepository: Repository<StorageProviderEntity>,
    private readonly providerService: StorageProviderService,
    private readonly folderService: StorageFolderService,
    private readonly driverFactory: StorageDriverFactory,
    private readonly router: StorageRouterService,
    private readonly referenceService: StorageReferenceService,
  ) {}

  /* ------------------------------- Upload ------------------------------- */

  async upload(file: Express.Multer.File, dto: UploadStorageFileDto, userId?: number): Promise<StorageUploadOutcome> {
    const decision = await this.router.route({
      sizeBytes: file.size ?? file.buffer.length,
      mimeType: file.mimetype,
      preferredProviderId: dto.provider_id,
    })

    const provider = decision.provider

    // folder_id là thư mục cụ thể người dùng chọn trên UI; folder_path là đường dẫn
    // nghiệp vụ, phải chờ router chốt dịch vụ xong mới tạo được đúng chỗ
    const folder = dto.folder_id
      ? await this.folderService.findFolderOrFail(dto.folder_id)
      : dto.folder_path
        ? await this.folderService.ensureFolderByPath(provider.id, dto.folder_path)
        : null

    if (folder && folder.provider_id !== provider.id) {
      throwAppException('STORAGE_FOLDER_NOT_FOUND', ErrorCode.STORAGE_FOLDER_NOT_FOUND, HttpStatus.BAD_REQUEST, {
        message: 'Thư mục không thuộc dịch vụ được chọn',
      })
    }

    const objectKey = this.buildObjectKey(provider, folder, file.originalname)
    const driver = this.driverFactory.create(provider)

    const result = await driver.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      objectKey,
    })

    const saved = await this.fileRepository.save(
      this.fileRepository.create({
        provider_id: provider.id,
        folder_id: folder?.id ?? null,
        object_key: result.objectKey,
        name: file.originalname,
        extension: this.extensionOf(file.originalname),
        mime_type: file.mimetype,
        kind: this.kindOf(file.mimetype, file.originalname),
        size_bytes: String(result.size),
        url: result.url,
        checksum: result.checksum ?? null,
        source: StorageFileSource.UPLOAD,
        uploaded_by: userId ?? null,
        remote_modified_at: new Date(),
      }),
    )

    // Cập nhật dần dung lượng để chia tải lần sau không dùng số liệu quá cũ.
    // Không gọi lại API dịch vụ ở đây vì sẽ làm chậm mỗi lần upload.
    await this.bumpUsage(provider.id, result.size, 1)

    return {
      file: saved,
      provider: { id: provider.id, name: provider.name, driver: provider.driver },
      route_reason: decision.reason,
    }
  }

  async uploadMany(files: Express.Multer.File[], dto: UploadStorageFileDto, userId?: number) {
    const results: StorageUploadOutcome[] = []
    const errors: { name: string; message: string }[] = []

    for (const file of files) {
      try {
        results.push(await this.upload(file, dto, userId))
      } catch (error: any) {
        // Một file lỗi không được làm hỏng cả lô
        errors.push({ name: file.originalname, message: error?.response?.message || error?.message || 'Upload thất bại' })
      }
    }

    return { uploaded: results, errors }
  }

  /* -------------------------------- Đọc -------------------------------- */

  async paginateFiles(params: PaginateStorageFileDto) {
    const { provider_id, folder_id, kind, search, unused_only, ...pagination } = params

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoin('file.provider', 'provider')
      .leftJoin('file.folder', 'folder')
      .addSelect(['provider.id', 'provider.name', 'provider.driver', 'provider.preset'])
      .addSelect(['folder.id', 'folder.name', 'folder.path'])

    if (provider_id) queryBuilder.andWhere('file.provider_id = :provider_id', { provider_id })

    // folder_id = 0 nghĩa là thư mục gốc, khác với "không lọc theo thư mục"
    if (folder_id === 0) queryBuilder.andWhere('file.folder_id IS NULL')
    else if (folder_id) queryBuilder.andWhere('file.folder_id = :folder_id', { folder_id })

    if (kind) queryBuilder.andWhere('file.kind = :kind', { kind })

    if (search) {
      queryBuilder.andWhere('(LOWER(file.name) LIKE :search OR LOWER(file.object_key) LIKE :search)', {
        search: `%${search.toLowerCase().trim()}%`,
      })
    }

    if (unused_only) queryBuilder.andWhere('file.reference_count = 0')

    const result = await paginate(queryBuilder, {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      ...pagination,
    })

    return result
  }

  async getFileById(id: number) {
    const file = await this.fileRepository.findOne({ where: { id }, relations: ['provider', 'folder'] })
    if (!file) {
      throwAppException('STORAGE_FILE_NOT_FOUND', ErrorCode.STORAGE_FILE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return file
  }

  /** Nơi nào trong hệ thống đang dùng file này. */
  async getFileReferences(id: number) {
    const file = await this.getFileById(id)
    const { references, total } = await this.referenceService.findReferences(id)

    // Lưu lại để lần sau lọc "file chưa dùng" không phải quét lại
    await this.fileRepository.update(id, { reference_count: total, reference_checked_at: new Date() })

    return {
      file_id: file.id,
      name: file.name,
      url: file.url,
      total,
      references,
      scanned_columns: this.referenceService.getScannedColumns().length,
    }
  }

  /** Link tải tạm thời, cho file nằm trên bucket không công khai. */
  async getSignedUrl(id: number, expiresInSeconds = 3600) {
    const file = await this.getFileById(id)
    const provider = await this.providerService.findProviderOrFail(file.provider_id)
    const driver = this.driverFactory.create(provider)

    const url = await driver.getSignedUrl(file.object_key, expiresInSeconds)
    if (!url) {
      // Không hỗ trợ link có hạn thì trả URL công khai nếu có, để UI vẫn xem được
      return { url: file.url, signed: false, expires_in: null }
    }
    return { url, signed: true, expires_in: expiresInSeconds }
  }

  /* -------------------------------- Sửa -------------------------------- */

  async renameFile(id: number, dto: RenameStorageFileDto) {
    const file = await this.getFileById(id)
    const provider = await this.providerService.findProviderOrFail(file.provider_id)
    const driver = this.driverFactory.create(provider)

    const newName = this.sanitizeFileName(dto.name)
    if (newName === file.name) return file

    if (!driver.capabilities.move) {
      throwAppException('STORAGE_OPERATION_NOT_SUPPORTED', ErrorCode.STORAGE_OPERATION_NOT_SUPPORTED, HttpStatus.BAD_REQUEST, {
        message: `Dịch vụ "${provider.name}" không hỗ trợ đổi tên file`,
      })
    }

    const newKey = [...file.object_key.split('/').slice(0, -1), newName].join('/')
    const resultKey = await driver.move(file.object_key, newKey)

    file.object_key = resultKey
    file.name = newName
    file.extension = this.extensionOf(newName)
    file.url = driver.getPublicUrl(resultKey) ?? file.url
    return this.fileRepository.save(file)
  }

  async moveFile(id: number, dto: MoveStorageFileDto) {
    const file = await this.getFileById(id)
    const provider = await this.providerService.findProviderOrFail(file.provider_id)
    const driver = this.driverFactory.create(provider)

    const targetFolder = dto.folder_id ? await this.folderService.findFolderOrFail(dto.folder_id) : null
    if (targetFolder && targetFolder.provider_id !== file.provider_id) {
      throwAppException('STORAGE_FOLDER_NOT_FOUND', ErrorCode.STORAGE_FOLDER_NOT_FOUND, HttpStatus.BAD_REQUEST, {
        message: 'Chỉ di chuyển được trong cùng một dịch vụ lưu trữ',
      })
    }

    if ((targetFolder?.id ?? null) === (file.folder_id ?? null)) return file

    if (!driver.capabilities.move) {
      throwAppException('STORAGE_OPERATION_NOT_SUPPORTED', ErrorCode.STORAGE_OPERATION_NOT_SUPPORTED, HttpStatus.BAD_REQUEST, {
        message: `Dịch vụ "${provider.name}" không hỗ trợ di chuyển file`,
      })
    }

    const fileName = file.object_key.split('/').pop()
    const newKey = [provider.path_prefix, targetFolder?.path, fileName].filter(Boolean).join('/')

    const resultKey = await driver.move(file.object_key, newKey)
    file.object_key = resultKey
    file.folder_id = targetFolder?.id ?? null
    file.url = driver.getPublicUrl(resultKey) ?? file.url
    return this.fileRepository.save(file)
  }

  /* -------------------------------- Xoá -------------------------------- */

  async deleteFile(id: number, force = false) {
    const file = await this.getFileById(id)

    // Mặc định chặn xoá file đang được dùng, vì xoá đi là ảnh/tài liệu trên web bị hỏng
    if (!force) {
      const { total } = await this.referenceService.findReferences(id, 1)
      if (total > 0) {
        throwAppException('STORAGE_FILE_IN_USE', ErrorCode.STORAGE_FILE_IN_USE, HttpStatus.BAD_REQUEST, {
          reference_count: total,
        })
      }
    }

    const provider = await this.providerService.findProviderOrFail(file.provider_id)
    await this.driverFactory.create(provider).delete(file.object_key)
    await this.fileRepository.softRemove(file)
    await this.bumpUsage(provider.id, -Number(file.size_bytes || 0), -1)

    return { id, deleted: true }
  }

  async bulkDelete(dto: BulkDeleteStorageFileDto) {
    const deleted: number[] = []
    const skipped: { id: number; reason: string }[] = []

    for (const id of dto.ids) {
      try {
        await this.deleteFile(id, dto.force ?? false)
        deleted.push(id)
      } catch (error: any) {
        skipped.push({ id, reason: error?.response?.message || error?.message || 'Không xoá được' })
      }
    }

    return { deleted, skipped, deleted_count: deleted.length, skipped_count: skipped.length }
  }

  /* ------------------------------- Quét ------------------------------- */

  /**
   * Quét file đã có sẵn trên dịch vụ vào index.
   *
   * Cần thiết vì trước khi có tính năng này, file được upload trực tiếp lên
   * R2/Cloudinary/ổ đĩa mà không ghi lại ở đâu. Quét xong mới quản lý được chúng
   * và mới biết file nào đang dùng ở đâu.
   */
  async scanProvider(providerId: number, dto: ScanStorageProviderDto) {
    const provider = await this.providerService.findProviderOrFail(providerId)
    const driver = this.driverFactory.create(provider)

    if (!driver.capabilities.listing) {
      throwAppException('STORAGE_OPERATION_NOT_SUPPORTED', ErrorCode.STORAGE_OPERATION_NOT_SUPPORTED, HttpStatus.BAD_REQUEST, {
        message: `Dịch vụ "${provider.name}" không hỗ trợ liệt kê file`,
      })
    }

    const limit = dto.limit ?? 5000
    const recursive = dto.recursive ?? true
    const startPrefix = [provider.path_prefix, dto.prefix].filter(Boolean).join('/')

    let imported = 0
    let updated = 0
    let scanned = 0
    const queue: string[] = [startPrefix]

    while (queue.length && scanned < limit) {
      const prefix = queue.shift()
      let cursor: string | undefined

      do {
        const page = await driver.list(prefix, cursor, Math.min(1000, limit - scanned))

        for (const object of page.objects) {
          scanned += 1
          const outcome = await this.indexRemoteObject(provider, object)
          if (outcome === 'created') imported += 1
          else if (outcome === 'updated') updated += 1
          if (scanned >= limit) break
        }

        if (recursive) queue.push(...page.prefixes)
        cursor = page.cursor || undefined
      } while (cursor && scanned < limit)
    }

    return {
      provider_id: providerId,
      provider_name: provider.name,
      scanned,
      imported,
      updated,
      /** true nghĩa là còn file chưa quét tới, gọi lại với limit lớn hơn */
      truncated: scanned >= limit,
    }
  }

  /* ------------------------------ private ------------------------------ */

  /** Ghi 1 object từ dịch vụ vào index, bỏ qua nếu đã có và không đổi. */
  private async indexRemoteObject(
    provider: StorageProviderEntity,
    object: { objectKey: string; name: string; size: number; mimeType?: string; checksum?: string; modifiedAt?: Date; url?: string | null },
  ): Promise<'created' | 'updated' | 'unchanged'> {
    const existing = await this.fileRepository.findOne({
      where: { provider_id: provider.id, object_key: object.objectKey },
      withDeleted: true,
    })

    // Dẫn xuất thư mục từ phần path của key, sau khi bỏ path_prefix của dịch vụ
    const relativeKey =
      provider.path_prefix && object.objectKey.startsWith(`${provider.path_prefix}/`)
        ? object.objectKey.slice(provider.path_prefix.length + 1)
        : object.objectKey
    const folderPath = relativeKey.split('/').slice(0, -1).join('/')
    const folder = folderPath ? await this.folderService.ensureFolderByPath(provider.id, folderPath) : null

    const mimeType = object.mimeType || this.guessMimeType(object.name)

    if (existing) {
      const sizeChanged = String(existing.size_bytes) !== String(object.size)
      const checksumChanged = Boolean(object.checksum) && existing.checksum !== object.checksum
      const wasDeleted = Boolean(existing.deleted_at)

      if (!sizeChanged && !checksumChanged && !wasDeleted && existing.folder_id === (folder?.id ?? null)) {
        return 'unchanged'
      }

      existing.deleted_at = null
      existing.size_bytes = String(object.size)
      existing.checksum = object.checksum ?? existing.checksum
      existing.folder_id = folder?.id ?? null
      existing.url = object.url ?? existing.url
      existing.remote_modified_at = object.modifiedAt ?? existing.remote_modified_at
      await this.fileRepository.save(existing)
      return 'updated'
    }

    await this.fileRepository.save(
      this.fileRepository.create({
        provider_id: provider.id,
        folder_id: folder?.id ?? null,
        object_key: object.objectKey,
        name: object.name,
        extension: this.extensionOf(object.name),
        mime_type: mimeType,
        kind: this.kindOf(mimeType, object.name),
        size_bytes: String(object.size),
        url: object.url ?? null,
        checksum: object.checksum ?? null,
        source: StorageFileSource.SCAN,
        remote_modified_at: object.modifiedAt ?? null,
      }),
    )
    return 'created'
  }

  /**
   * Tên file đích trên dịch vụ. Luôn thêm timestamp + chuỗi ngẫu nhiên để hai
   * người upload cùng tên file không ghi đè nhau, và giữ lại tên gốc đã làm sạch
   * để nhìn vào key còn đoán được đó là file gì.
   */
  private buildObjectKey(provider: StorageProviderEntity, folder: StorageFolderEntity | null, originalName: string): string {
    const extension = this.extensionOf(originalName)
    const base = path
      .basename(originalName, extension ? `.${extension}` : '')
      .normalize('NFD')
      // Bỏ dấu tiếng Việt để key an toàn trên mọi dịch vụ
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .toLowerCase()

    const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const fileName = `${base ? `${base}_` : ''}${unique}${extension ? `.${extension}` : ''}`

    return [provider.path_prefix, folder?.path, fileName].filter(Boolean).join('/')
  }

  private sanitizeFileName(name: string): string {
    // Bỏ dấu phân cách đường dẫn và dấu chấm đầu, để tên file không leo ra khỏi thư mục
    const cleaned = String(name || '')
      .replace(/[/\\]/g, '')
      .replace(/^\.+/, '')
      .trim()

    if (!cleaned) {
      throwAppException('STORAGE_FILE_NOT_FOUND', ErrorCode.STORAGE_FILE_NOT_FOUND, HttpStatus.BAD_REQUEST, {
        message: 'Tên file không hợp lệ',
      })
    }
    return cleaned
  }

  private extensionOf(fileName: string): string {
    const extension = path.extname(fileName || '').replace(/^\./, '')
    return extension ? extension.toLowerCase().slice(0, 20) : null
  }

  /** Nhóm loại file để UI lọc nhanh. */
  private kindOf(mimeType: string, fileName: string): StorageFileKind {
    const mime = (mimeType || '').toLowerCase()

    if (mime.startsWith('image/')) return StorageFileKind.IMAGE
    if (mime.startsWith('video/')) return StorageFileKind.VIDEO
    if (mime.startsWith('audio/')) return StorageFileKind.AUDIO
    if (DOCUMENT_MIMES.has(mime)) return StorageFileKind.DOCUMENT
    if (ARCHIVE_MIMES.has(mime)) return StorageFileKind.ARCHIVE

    // Dịch vụ không trả mime thì đoán theo phần mở rộng
    const extension = this.extensionOf(fileName)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'heic'].includes(extension)) {
      return StorageFileKind.IMAGE
    }
    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v'].includes(extension)) return StorageFileKind.VIDEO
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return StorageFileKind.AUDIO
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'].includes(extension)) {
      return StorageFileKind.DOCUMENT
    }
    if (['zip', 'rar', '7z', 'gz', 'tar', 'bz2'].includes(extension)) return StorageFileKind.ARCHIVE

    return StorageFileKind.OTHER
  }

  /** Suy mime từ phần mở rộng, cho các dịch vụ không trả Content-Type khi liệt kê. */
  private guessMimeType(fileName: string): string {
    const extension = this.extensionOf(fileName)
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      avif: 'image/avif',
      ico: 'image/x-icon',
      heic: 'image/heic',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      gz: 'application/gzip',
      tar: 'application/x-tar',
    }
    return map[extension] || 'application/octet-stream'
  }

  /**
   * Điều chỉnh dần số liệu dung lượng cache sau mỗi lần upload/xoá.
   * Chỉ là xấp xỉ giữa hai lần làm mới thật, nhưng đủ để chia tải không chọn
   * sai dịch vụ sau một loạt upload lớn.
   */
  private async bumpUsage(providerId: number, deltaBytes: number, deltaObjects: number) {
    try {
      const provider = await this.providerRepository.findOne({ where: { id: providerId } })
      if (!provider) return

      if (provider.usage_bytes !== null && provider.usage_bytes !== undefined) {
        provider.usage_bytes = String(Math.max(Number(provider.usage_bytes) + deltaBytes, 0))
      }
      if (provider.usage_own_bytes !== null && provider.usage_own_bytes !== undefined) {
        provider.usage_own_bytes = String(Math.max(Number(provider.usage_own_bytes) + deltaBytes, 0))
      }
      if (provider.usage_objects !== null && provider.usage_objects !== undefined) {
        provider.usage_objects = String(Math.max(Number(provider.usage_objects) + deltaObjects, 0))
      }
      await this.providerRepository.save(provider)
    } catch (error: any) {
      // Số liệu xấp xỉ không quan trọng tới mức làm upload thất bại
      this.logger.debug(`Không cập nhật được dung lượng tạm thời: ${error?.message}`)
    }
  }
}
