import { StorageDriver } from '@enums/storage.enum'
import axios, { AxiosInstance } from 'axios'
import { STORAGE_DRIVER_SCHEMA_MAP, StorageDriverCapabilities } from '../storage.constants'
import { oauthTokenCache } from './oauth-token-cache'
import {
  IStorageDriver,
  StorageListResult,
  StorageTestResult,
  StorageUploadInput,
  StorageUploadResult,
  StorageUsage,
} from './storage-driver.interface'

const GRAPH_API = 'https://graph.microsoft.com/v1.0'
/** Graph cho upload trực tiếp tối đa 4MB, lớn hơn phải dùng upload session. */
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024
const CHUNK_SIZE = 10 * 1024 * 1024

/**
 * Driver OneDrive / SharePoint qua Microsoft Graph.
 *
 * Hai chế độ:
 * - Có refresh_token: thao tác trên /me/drive của user đó (OneDrive cá nhân/doanh nghiệp).
 * - Không có refresh_token: dùng client credentials (app-only), bắt buộc phải có
 *   drive_id vì app-only không có /me.
 *
 * `objectKey` là đường dẫn tương đối tính từ thư mục gốc đã cấu hình.
 */
export class OneDriveStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.ONEDRIVE).capabilities

  private readonly http: AxiosInstance

  constructor(private readonly config: Record<string, any>) {
    this.http = axios.create({ timeout: 120000 })
  }

  async test(): Promise<StorageTestResult> {
    try {
      if (!this.config.refresh_token && !this.config.drive_id) {
        return {
          ok: false,
          message: 'Chế độ app-only (không có refresh token) bắt buộc phải điền Drive ID vì Graph không có /me cho app-only.',
        }
      }

      const token = await this.getAccessToken(true)
      const drive = await this.http.get(`${this.driveRoot()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const quota = drive.data?.quota || {}
      return {
        ok: true,
        message: `Kết nối thành công${quota.state ? ` (trạng thái dung lượng: ${quota.state})` : ''}`,
        details: {
          drive_id: drive.data?.id,
          drive_name: drive.data?.name,
          owner: drive.data?.owner?.user?.displayName || drive.data?.owner?.user?.email,
          total_bytes: quota.total !== undefined ? Number(quota.total) : null,
          used_bytes: quota.used !== undefined ? Number(quota.used) : null,
          remaining_bytes: quota.remaining !== undefined ? Number(quota.remaining) : null,
          state: quota.state,
        },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const token = await this.getAccessToken()
    const remotePath = this.toRemotePath(input.objectKey)

    const item =
      input.buffer.length <= SIMPLE_UPLOAD_LIMIT
        ? await this.uploadSimple(remotePath, input, token)
        : await this.uploadInChunks(remotePath, input, token)

    return {
      objectKey: input.objectKey,
      url: await this.ensureSharedLink(item.id, token),
      size: Number(item.size || input.buffer.length),
      checksum: item.file?.hashes?.quickXorHash || item.file?.hashes?.sha256Hash || item.eTag,
    }
  }

  async delete(objectKey: string): Promise<void> {
    const token = await this.getAccessToken()
    try {
      await this.http.delete(`${this.driveRoot()}/root:${this.encodePath(this.toRemotePath(objectKey))}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const token = await this.getAccessToken()
    const response = await this.http.get<ArrayBuffer>(`${this.driveRoot()}/root:${this.encodePath(this.toRemotePath(objectKey))}:/content`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    })
    return Buffer.from(response.data)
  }

  async list(prefix: string, cursor?: string, limit = 200): Promise<StorageListResult> {
    const token = await this.getAccessToken()
    const remotePath = this.toRemotePath(prefix || '')

    // Graph trả nextLink là URL đầy đủ, nên khi có cursor thì gọi thẳng URL đó
    const url = cursor || `${this.driveRoot()}/root${remotePath ? `:${this.encodePath(remotePath)}:` : ''}/children?$top=${limit}`

    let response: any
    try {
      response = await this.http.get(url, { headers: { Authorization: `Bearer ${token}` } })
    } catch (error: any) {
      if (error?.response?.status === 404) return { objects: [], prefixes: [], cursor: null }
      throw error
    }

    const objects: StorageListResult['objects'] = []
    const prefixes: string[] = []

    for (const item of response.data.value || []) {
      const key = prefix ? `${prefix}/${item.name}` : item.name
      if (item.folder) {
        prefixes.push(key)
        continue
      }
      objects.push({
        objectKey: key,
        name: item.name,
        size: Number(item.size || 0),
        mimeType: item.file?.mimeType,
        checksum: item.file?.hashes?.quickXorHash || item.file?.hashes?.sha256Hash,
        modifiedAt: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
      })
    }

    return { objects, prefixes, cursor: response.data['@odata.nextLink'] || null }
  }

  async getUsage(): Promise<StorageUsage> {
    const token = await this.getAccessToken()
    const response = await this.http.get(this.driveRoot(), { headers: { Authorization: `Bearer ${token}` } })

    const quota = response.data?.quota || {}
    return {
      usedBytes: quota.used !== undefined ? Number(quota.used) : null,
      totalBytes: quota.total !== undefined ? Number(quota.total) : null,
      objectCount: null,
      source: 'provider_api',
    }
  }

  /** Link công khai phải tạo qua Graph nên chỉ có sau khi upload. */
  getPublicUrl(): string | null {
    return null
  }

  async getSignedUrl(objectKey: string): Promise<string | null> {
    const token = await this.getAccessToken()
    try {
      // @microsoft.graph.downloadUrl là link tải trực tiếp, sống khoảng 1 tiếng
      const response = await this.http.get(`${this.driveRoot()}/root:${this.encodePath(this.toRemotePath(objectKey))}`, {
        params: { $select: 'id,@microsoft.graph.downloadUrl' },
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data?.['@microsoft.graph.downloadUrl'] || null
    } catch {
      return null
    }
  }

  async createFolder(folderPath: string): Promise<string | null> {
    const token = await this.getAccessToken()
    const segments = this.toRemotePath(folderPath).split('/').filter(Boolean)

    let current = ''
    let lastId: string | null = null
    for (const segment of segments) {
      const parentPath = current
      current = current ? `${current}/${segment}` : segment
      try {
        const created = await this.http.post(
          `${this.driveRoot()}/root${parentPath ? `:${this.encodePath(parentPath)}:` : ''}/children`,
          { name: segment, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        )
        lastId = created.data.id
      } catch (error: any) {
        // 409 = folder đã tồn tại, lấy id của nó để tiếp tục đi sâu
        if (error?.response?.status !== 409) throw error
        const existing = await this.http.get(`${this.driveRoot()}/root:${this.encodePath(current)}`, {
          params: { $select: 'id' },
          headers: { Authorization: `Bearer ${token}` },
        })
        lastId = existing.data.id
      }
    }
    return lastId
  }

  async deleteFolder(folderPath: string): Promise<void> {
    await this.delete(folderPath)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    const token = await this.getAccessToken()
    const targetPath = this.toRemotePath(toKey)
    const targetFolder = targetPath.split('/').slice(0, -1).join('/')
    const name = targetPath.split('/').pop()

    // parentReference trỏ tới folder đích; phải đảm bảo folder tồn tại trước
    if (targetFolder) await this.createFolder(toKey.split('/').slice(0, -1).join('/'))

    const parentReference = targetFolder ? { path: `/drive/root:${this.encodePath(targetFolder)}` } : { path: '/drive/root:' }

    await this.http.patch(
      `${this.driveRoot()}/root:${this.encodePath(this.toRemotePath(fromKey))}`,
      { name, parentReference },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    )
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  private driveRoot(): string {
    return this.config.drive_id ? `${GRAPH_API}/drives/${this.config.drive_id}` : `${GRAPH_API}/me/drive`
  }

  private toRemotePath(objectKey: string): string {
    const root = String(this.config.root_path || '').replace(/^\/+|\/+$/g, '')
    const key = String(objectKey || '').replace(/^\/+|\/+$/g, '')
    return [root, key].filter(Boolean).join('/')
  }

  /**
   * Graph định địa chỉ item bằng cú pháp /root:/duong/dan:. Phải encode từng
   * segment để tên file có dấu cách / tiếng Việt không làm hỏng URL, nhưng giữ
   * nguyên dấu / phân cách.
   */
  private encodePath(remotePath: string): string {
    const encoded = remotePath.split('/').filter(Boolean).map(encodeURIComponent).join('/')
    return encoded ? `/${encoded}` : ''
  }

  private async uploadSimple(remotePath: string, input: StorageUploadInput, token: string): Promise<any> {
    const response = await this.http.put(`${this.driveRoot()}/root:${this.encodePath(remotePath)}:/content`, input.buffer, {
      params: { '@microsoft.graph.conflictBehavior': 'replace' },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': input.mimeType || 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })
    return response.data
  }

  private async uploadInChunks(remotePath: string, input: StorageUploadInput, token: string): Promise<any> {
    const session = await this.http.post(
      `${this.driveRoot()}/root:${this.encodePath(remotePath)}:/createUploadSession`,
      { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    )

    const uploadUrl: string = session.data.uploadUrl
    const total = input.buffer.length
    let offset = 0
    let lastResponse: any

    while (offset < total) {
      const end = Math.min(offset + CHUNK_SIZE, total)
      const chunk = input.buffer.subarray(offset, end)
      lastResponse = await this.http.put(uploadUrl, chunk, {
        headers: {
          // Upload session dùng URL đã ký sẵn, KHÔNG gửi Authorization
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${offset}-${end - 1}/${total}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      })
      offset = end
    }

    return lastResponse?.data || {}
  }

  private async ensureSharedLink(itemId: string, token: string): Promise<string | null> {
    if (!itemId) return null
    try {
      const response = await this.http.post(
        `${this.driveRoot()}/items/${itemId}/createLink`,
        { type: 'view', scope: 'anonymous' },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
      return response.data?.link?.webUrl || null
    } catch {
      // Tổ chức chặn chia sẻ ẩn danh thì vẫn coi upload là thành công
      return null
    }
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const tenant = this.config.tenant_id || 'common'
    const parts = ['onedrive', tenant, this.config.client_id, this.config.client_secret, this.config.refresh_token]
    if (forceRefresh) oauthTokenCache.invalidate(parts)

    return oauthTokenCache.get(parts, async () => {
      const body = this.config.refresh_token
        ? new URLSearchParams({
            client_id: this.config.client_id,
            client_secret: this.config.client_secret,
            refresh_token: this.config.refresh_token,
            grant_type: 'refresh_token',
            scope: 'offline_access Files.ReadWrite.All',
          })
        : new URLSearchParams({
            client_id: this.config.client_id,
            client_secret: this.config.client_secret,
            grant_type: 'client_credentials',
            scope: 'https://graph.microsoft.com/.default',
          })

      const response = await this.http.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return { accessToken: response.data.access_token, expiresInSeconds: Number(response.data.expires_in || 3600) }
    })
  }

  private describeError(error: any): string {
    const data = error?.response?.data
    const code = data?.error?.code || data?.error

    if (code === 'invalid_grant') return 'Refresh token không còn hiệu lực, cần kết nối lại OneDrive.'
    if (code === 'invalid_client') return 'Client ID hoặc Client secret không đúng.'
    if (code === 'quotaLimitReached' || code === 'storageLimitReached') return 'OneDrive đã hết dung lượng.'
    if (code === 'itemNotFound' || error?.response?.status === 404) {
      return 'Không tìm thấy drive hoặc thư mục gốc đã cấu hình.'
    }
    if (error?.response?.status === 403) {
      return data?.error?.message || 'Thiếu quyền Files.ReadWrite.All, hoặc admin chưa cấp quyền (admin consent) cho app.'
    }

    return data?.error?.message || data?.error_description || error?.message || 'Không kết nối được OneDrive'
  }
}
