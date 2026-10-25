import { StorageDriver } from '@enums/storage.enum'
import { STORAGE_DRIVER_SCHEMA_MAP, StorageDriverCapabilities } from '../storage.constants'
import {
  IStorageDriver,
  StorageListResult,
  StorageRemoteObject,
  StorageTestResult,
  StorageUploadInput,
  StorageUploadResult,
  StorageUsage,
} from './storage-driver.interface'

/** Thời gian chờ tối đa cho một lần gọi API hvm-storage. */
const REQUEST_TIMEOUT_MS = 20_000

/** Hạn mặc định của link tải tạm khi driver cần tự tải file về (download/move). */
const INTERNAL_SIGNED_URL_TTL = 300

/* ------------------------------------------------------------------ *
 *  DTO theo hợp đồng hvm-storage/docs/INTEGRATION.md
 * ------------------------------------------------------------------ */

export type HvmPermission = 'read' | 'upload' | 'write' | 'delete'

export interface HvmFileDto {
  type: 'file'
  id: string
  kind: 'VIDEO' | 'IMAGE' | 'FILE'
  title: string
  filename: string | null
  mimeType: string | null
  sizeBytes: number | null
  status: 'DRAFT' | 'UPLOADING' | 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
  visibility: 'PRIVATE' | 'UNLISTED' | 'PASSWORD' | 'DOMAIN_LOCKED' | 'PUBLIC'
  folderId: string | null
  createdAt: string
  urls: {
    file: string | null
    embed: string | null
    watch: string | null
    download: string
    poster: string | null
  }
  video?: { durationSec: number; width: number; height: number; ready: boolean } | null
}

export interface HvmFolderDto {
  type: 'folder'
  id: string
  title: string
  parentId: string | null
  path: string
  counts: { children: number }
}

export interface HvmMeDto {
  app: { id: string; name: string; slug: string }
  rootFolder: { id: string; title: string }
  allowedOrigins: string[]
  defaultVisibility: string
  quota: { usedBytes: number; limitBytes: number | null }
  deliveryOrigin: string
  appOrigin: string
}

export interface HvmSessionRequest {
  subject?: string
  permissions?: HvmPermission[]
  ttlSeconds?: number
}

export interface HvmSessionDto {
  token: string
  expiresAt: string
  hubUrl: string
  deliveryOrigin: string
}

/** Lỗi do hvm-storage trả về, giữ lại mã HTTP để nơi gọi phân biệt 404 với lỗi thật. */
export class HvmStorageError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'HvmStorageError'
  }
}

/**
 * Driver hvm-storage (kho video/file tự host của giáo xứ).
 *
 * Khác các driver object storage: hvm-storage định danh file bằng `id` do nó cấp,
 * không phải đường dẫn. Vì vậy `objectKey` lưu trong index chính là `FileDto.id`;
 * phần thư mục của objectKey đề xuất chỉ dùng để chọn `folderPath` lúc upload.
 *
 * Mọi thao tác đều nằm trong thư mục gốc mà hvm-storage gán cho ứng dụng; nếu
 * cấu hình thêm `folder_path` thì nằm sâu thêm một tầng nữa (ví dụ "academy").
 */
export class HvmStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.HVM).capabilities

  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly rootPath: string
  private readonly defaultVisibility: string | null

  /** Kết quả GET /me, lấy một lần cho mỗi instance driver. */
  private mePromise: Promise<HvmMeDto> | null = null
  /** id thư mục theo đường dẫn đã ensure, để không gọi /folders/ensure lặp lại. */
  private readonly folderIdByPath = new Map<string, string>()
  /** URL công khai theo id file, để getPublicUrl (đồng bộ) trả được sau upload/list. */
  private readonly publicUrlById = new Map<string, string | null>()

  constructor(
    private readonly config: Record<string, any>,
    private readonly publicBaseUrl?: string,
  ) {
    this.baseUrl = String(config.base_url || '').replace(/\/+$/, '')
    this.apiKey = String(config.api_key || '')
    this.rootPath = this.cleanPath(config.folder_path)
    this.defaultVisibility = config.default_visibility ? String(config.default_visibility) : null
  }

  /* ------------------------------ IStorageDriver ------------------------------ */

  async test(): Promise<StorageTestResult> {
    try {
      if (!this.baseUrl) return { ok: false, message: 'Chưa nhập URL của hvm-storage.' }
      if (!this.apiKey) return { ok: false, message: 'Chưa nhập API key của hvm-storage.' }

      const me = await this.fetchMe(true)
      return {
        ok: true,
        message: `Kết nối thành công với ứng dụng "${me.app?.name || me.app?.slug}"`,
        details: {
          app: me.app,
          rootFolder: me.rootFolder,
          folder_path: this.rootPath || null,
          deliveryOrigin: me.deliveryOrigin,
          appOrigin: me.appOrigin,
          defaultVisibility: me.defaultVisibility,
          used_bytes: me.quota?.usedBytes ?? null,
          total_bytes: me.quota?.limitBytes ?? null,
        },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const form = new FormData()
    form.append('file', new Blob([input.buffer], { type: input.mimeType || 'application/octet-stream' }), input.originalName)

    // Thư mục đích = folder_path cấu hình + phần thư mục của objectKey đề xuất.
    // hvm-storage tự tạo đoạn nào còn thiếu nên không cần ensure trước.
    const folderPath = this.remotePath(this.dirname(input.objectKey))
    if (folderPath) form.append('folderPath', folderPath)
    if (input.originalName) form.append('title', input.originalName)
    if (this.defaultVisibility) form.append('visibility', this.defaultVisibility)

    const dto = await this.request<HvmFileDto>('POST', '/api/integration/files', { form, action: 'tải file lên' })
    const url = this.urlOf(dto)
    this.publicUrlById.set(dto.id, url)

    return {
      objectKey: dto.id,
      url,
      size: dto.sizeBytes ?? input.buffer.length,
    }
  }

  async delete(objectKey: string): Promise<void> {
    let id: string | null
    try {
      id = await this.resolveId(objectKey)
    } catch (error: any) {
      // Không phân giải được URL => file không còn, coi như đã xoá
      if (error instanceof HvmStorageError && error.status === 404) return
      throw error
    }
    if (!id) return

    try {
      await this.request('DELETE', `/api/integration/files/${encodeURIComponent(id)}`, { action: 'xoá file' })
    } catch (error: any) {
      if (error instanceof HvmStorageError && error.status === 404) return
      throw error
    }
    this.publicUrlById.delete(id)
  }

  async download(objectKey: string): Promise<Buffer> {
    const id = await this.resolveId(objectKey)
    const signed = await this.request<{ url: string; expiresAt: string }>('GET', `/api/integration/files/${encodeURIComponent(id)}/signed-url`, {
      query: { ttl: INTERNAL_SIGNED_URL_TTL },
      action: 'lấy link tải',
    })

    const response = await this.rawFetch(signed.url, { method: 'GET' })
    if (!response.ok) {
      throw new HvmStorageError(`Không tải được nội dung file từ hvm-storage (HTTP ${response.status}).`, response.status)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  async list(prefix: string, cursor?: string, limit = 200): Promise<StorageListResult> {
    const folderId = await this.folderIdForPath(this.remotePath(prefix), false)
    if (!folderId) return { objects: [], prefixes: [], cursor: null }

    const skip = Math.max(0, Number(cursor || 0) || 0)
    const take = Math.min(Math.max(1, limit), 200)
    const cleanPrefix = this.cleanPath(prefix)

    // Thư mục con chỉ cần lấy ở trang đầu; các trang sau chỉ phân trang file
    const prefixes: string[] = []
    if (skip === 0) {
      const folders = await this.request<{ items: HvmFolderDto[] }>('GET', '/api/integration/folders', {
        query: { parentId: folderId },
        action: 'liệt kê thư mục',
      })
      for (const folder of folders.items || []) {
        prefixes.push(cleanPrefix ? `${cleanPrefix}/${folder.title}` : folder.title)
      }
    }

    const files = await this.request<{ items: HvmFileDto[]; total: number }>('GET', '/api/integration/files', {
      query: { folderId, take, skip },
      action: 'liệt kê file',
    })

    const objects: StorageRemoteObject[] = (files.items || []).map(dto => {
      const url = this.urlOf(dto)
      this.publicUrlById.set(dto.id, url)
      return {
        objectKey: dto.id,
        name: dto.filename || dto.title,
        size: Number(dto.sizeBytes || 0),
        mimeType: dto.mimeType || undefined,
        modifiedAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        url,
      }
    })

    const next = skip + objects.length
    return { objects, prefixes, cursor: objects.length > 0 && next < Number(files.total || 0) ? String(next) : null }
  }

  async getUsage(): Promise<StorageUsage> {
    const me = await this.fetchMe(true)
    return {
      usedBytes: me.quota?.usedBytes ?? null,
      totalBytes: me.quota?.limitBytes ?? null,
      objectCount: null,
      source: 'provider_api',
    }
  }

  /**
   * Interface này đồng bộ nên không gọi API được. Trả URL đã biết từ lần
   * upload/list gần nhất trong cùng instance; chưa biết thì null, và tầng trên
   * giữ nguyên URL cũ trong index (URL của hvm-storage ổn định theo id nên vẫn đúng).
   */
  getPublicUrl(objectKey: string): string | null {
    return this.publicUrlById.get(objectKey) ?? null
  }

  async getSignedUrl(objectKey: string, expiresInSeconds: number): Promise<string | null> {
    const id = await this.resolveId(objectKey)
    const ttl = Math.min(Math.max(1, Math.floor(expiresInSeconds || 3600)), 7 * 24 * 3600)
    const signed = await this.request<{ url: string; expiresAt: string }>('GET', `/api/integration/files/${encodeURIComponent(id)}/signed-url`, {
      query: { ttl },
      action: 'lấy link tải tạm thời',
    })
    return signed.url
  }

  async createFolder(folderPath: string): Promise<string | null> {
    const remote = this.remotePath(folderPath)
    if (!remote) return (await this.fetchMe()).rootFolder.id
    return this.folderIdForPath(remote, true)
  }

  async deleteFolder(folderPath: string, remoteId?: string): Promise<void> {
    // Không bao giờ ensure ở đây: ensure sẽ tạo lại thư mục chỉ để xoá nó
    const id = remoteId || (await this.folderIdForPath(this.remotePath(folderPath), false))
    if (!id) return

    try {
      await this.request('DELETE', `/api/integration/folders/${encodeURIComponent(id)}`, { action: 'xoá thư mục' })
    } catch (error: any) {
      if (error instanceof HvmStorageError && error.status === 404) return
      throw error
    }

    for (const [path, folderId] of this.folderIdByPath) {
      if (folderId === id) this.folderIdByPath.delete(path)
    }
  }

  /**
   * Đổi tên / di chuyển. `fromKey` là id file; `toKey` là key đề xuất của tầng trên
   * (thư mục đích + tên mới). Id không đổi nên trả lại chính `fromKey`.
   */
  async move(fromKey: string, toKey: string): Promise<string> {
    const id = await this.resolveId(fromKey)
    const current = await this.getFile(id)

    const targetDir = this.remotePath(this.dirname(toKey))
    const newName = this.basename(toKey)

    const folderId = targetDir ? await this.folderIdForPath(targetDir, true) : (await this.fetchMe()).rootFolder.id

    const patch: Record<string, any> = {}
    if (folderId && folderId !== current.folderId) patch.folderId = folderId
    if (newName && newName !== current.title && newName !== current.filename) patch.title = newName

    if (Object.keys(patch).length) {
      const updated = await this.request<HvmFileDto>('PATCH', `/api/integration/files/${encodeURIComponent(id)}`, {
        body: patch,
        action: 'di chuyển / đổi tên file',
      })
      this.publicUrlById.set(updated.id, this.urlOf(updated))
    }

    return id
  }

  /* ------------------------------ API riêng của hvm-storage ------------------------------ */

  /** Đổi API key lấy hub token cho trình duyệt (xem INTEGRATION.md mục 2). */
  async createSession(request: HvmSessionRequest): Promise<HvmSessionDto> {
    return this.request<HvmSessionDto>('POST', '/api/integration/sessions', { body: request, action: 'tạo phiên làm việc' })
  }

  /** Thông tin ứng dụng, thư mục gốc và hạn mức. */
  async getMe(): Promise<HvmMeDto> {
    return this.fetchMe()
  }

  /** Lấy FileDto theo id, kèm cập nhật cache URL công khai. */
  async getFile(id: string): Promise<HvmFileDto> {
    const dto = await this.request<HvmFileDto>('GET', `/api/integration/files/${encodeURIComponent(id)}`, { action: 'đọc thông tin file' })
    this.publicUrlById.set(dto.id, this.urlOf(dto))
    return dto
  }

  /* ------------------------------ private ------------------------------ */

  private fetchMe(force = false): Promise<HvmMeDto> {
    if (!this.mePromise || force) {
      this.mePromise = this.request<HvmMeDto>('GET', '/api/integration/me', { action: 'kiểm tra kết nối' }).catch(error => {
        // Lỗi thì bỏ cache để lần sau thử lại
        this.mePromise = null
        throw error
      })
    }
    return this.mePromise
  }

  /**
   * Tìm id thư mục theo đường dẫn (đã gồm folder_path). Rỗng = thư mục gốc.
   * `create = true` dùng /folders/ensure; `false` chỉ dò từng cấp, không thấy trả null.
   */
  private async folderIdForPath(remotePath: string, create: boolean): Promise<string | null> {
    if (!remotePath) return (await this.fetchMe()).rootFolder.id

    const cached = this.folderIdByPath.get(remotePath)
    if (cached) return cached

    if (create) {
      const folder = await this.request<HvmFolderDto>('POST', '/api/integration/folders/ensure', {
        body: { path: remotePath },
        action: `tạo thư mục "${remotePath}"`,
      })
      this.folderIdByPath.set(remotePath, folder.id)
      return folder.id
    }

    // Dò từng cấp từ thư mục gốc xuống
    let parentId = (await this.fetchMe()).rootFolder.id
    let walked = ''
    for (const segment of remotePath.split('/')) {
      walked = walked ? `${walked}/${segment}` : segment
      const known = this.folderIdByPath.get(walked)
      if (known) {
        parentId = known
        continue
      }
      const children = await this.request<{ items: HvmFolderDto[] }>('GET', '/api/integration/folders', {
        query: { parentId },
        action: 'liệt kê thư mục',
      })
      const match = (children.items || []).find(item => item.title === segment)
      if (!match) return null
      this.folderIdByPath.set(walked, match.id)
      parentId = match.id
    }
    return parentId
  }

  /**
   * objectKey bình thường chính là id file. Nhưng khi tầng trên suy key từ URL
   * (xoá file chưa có trong index) thì key có dạng "f/<id>/<tên>" hoặc cả URL;
   * khi đó tách id ra, không được thì nhờ /resolve.
   */
  private async resolveId(objectKey: string): Promise<string> {
    const key = String(objectKey || '').trim()
    if (!key) throw new HvmStorageError('Thiếu id file trên hvm-storage.', null)
    if (!key.includes('/')) return key

    const direct = key.match(/(?:^|\/)(?:f|watch)\/([^/?#]+)/)
    if (direct) return direct[1]

    const url = /^https?:\/\//i.test(key) ? key : `${(this.publicBaseUrl || this.baseUrl).replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`
    const dto = await this.request<HvmFileDto>('GET', '/api/integration/resolve', { query: { url }, action: 'phân giải URL file' })
    return dto.id
  }

  /** URL dùng được ngay: ảnh/tài liệu là link trực tiếp, video là trang nhúng. */
  private urlOf(dto: HvmFileDto): string | null {
    return dto.urls?.file ?? dto.urls?.embed ?? dto.urls?.watch ?? null
  }

  /** Ghép folder_path cấu hình với đường dẫn tầng trên đưa xuống. */
  private remotePath(path: string | null | undefined): string {
    return [this.rootPath, this.cleanPath(path)].filter(Boolean).join('/')
  }

  private cleanPath(path: unknown): string {
    return String(path || '')
      .split('/')
      .map(part => part.trim())
      .filter(part => part && part !== '.' && part !== '..')
      .join('/')
  }

  private dirname(objectKey: string): string {
    const parts = this.cleanPath(objectKey).split('/')
    return parts.slice(0, -1).join('/')
  }

  private basename(objectKey: string): string {
    return this.cleanPath(objectKey).split('/').pop() || ''
  }

  private async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: { query?: Record<string, any>; body?: any; form?: FormData; action: string } = { action: 'gọi API' },
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }

    const headers: Record<string, string> = { 'X-Api-Key': this.apiKey, Accept: 'application/json' }
    let body: BodyInit | undefined
    if (options.form) {
      body = options.form
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    const response = await this.rawFetch(url.toString(), { method, headers, body })
    const text = await response.text()
    const payload = this.parseJson(text)

    if (!response.ok) {
      const detail = payload?.message || (text ? text.slice(0, 300) : '')
      throw new HvmStorageError(
        `hvm-storage trả về lỗi ${response.status} khi ${options.action}${detail ? `: ${detail}` : ''}`,
        response.status,
        payload?.code,
      )
    }
    return payload as T
  }

  /** fetch có giới hạn thời gian, bọc lỗi mạng thành thông báo tiếng Việt. */
  private async rawFetch(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new HvmStorageError(`hvm-storage không phản hồi sau ${REQUEST_TIMEOUT_MS / 1000} giây (${this.baseUrl}).`, null, 'TIMEOUT')
      }
      const cause = error?.cause?.code || error?.code
      throw new HvmStorageError(`Không kết nối được hvm-storage tại ${this.baseUrl}${cause ? ` (${cause})` : ''}: ${error?.message}`, null, cause)
    } finally {
      clearTimeout(timer)
    }
  }

  private parseJson(text: string): any {
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  private describeError(error: any): string {
    if (error instanceof HvmStorageError) {
      if (error.status === 401 || error.status === 403) {
        return `API key bị hvm-storage từ chối (HTTP ${error.status}). Kiểm tra lại key trên /admin/integrations của hvm-storage, hoặc ứng dụng đã bị tắt.`
      }
      return error.message
    }
    return error?.message || 'Không kết nối được hvm-storage'
  }
}
