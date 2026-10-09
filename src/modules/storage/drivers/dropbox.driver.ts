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

const DROPBOX_API = 'https://api.dropboxapi.com/2'
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2'
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
/** Dropbox giới hạn upload 1 phát 150MB, lớn hơn phải dùng upload_session. */
const SINGLE_UPLOAD_LIMIT = 150 * 1024 * 1024
const CHUNK_SIZE = 8 * 1024 * 1024

/**
 * Driver Dropbox. `objectKey` là đường dẫn tương đối, driver tự ghép thư mục gốc.
 * Dung lượng lấy từ /2/users/get_space_usage: tài khoản cá nhân đọc
 * individual.allocated, tài khoản team đọc team.allocated + used.
 */
export class DropboxStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.DROPBOX).capabilities

  private readonly http: AxiosInstance

  constructor(private readonly config: Record<string, any>) {
    this.http = axios.create({ timeout: 120000 })
  }

  async test(): Promise<StorageTestResult> {
    try {
      const token = await this.getAccessToken(true)
      const account = await this.http.post(`${DROPBOX_API}/users/get_current_account`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const usage = await this.getUsage()

      return {
        ok: true,
        message: 'Kết nối thành công',
        details: {
          account: account.data?.email,
          used_bytes: usage.usedBytes,
          total_bytes: usage.totalBytes,
        },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const token = await this.getAccessToken()
    const remotePath = this.toRemotePath(input.objectKey)

    const metadata =
      input.buffer.length <= SINGLE_UPLOAD_LIMIT
        ? await this.uploadSingle(remotePath, input.buffer, token)
        : await this.uploadInChunks(remotePath, input.buffer, token)

    return {
      objectKey: input.objectKey,
      url: await this.ensureSharedLink(remotePath, token),
      size: Number(metadata.size || input.buffer.length),
      checksum: metadata.content_hash,
    }
  }

  async delete(objectKey: string): Promise<void> {
    const token = await this.getAccessToken()
    try {
      await this.http.post(
        `${DROPBOX_API}/files/delete_v2`,
        { path: this.toRemotePath(objectKey) },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
    } catch (error: any) {
      // path/not_found => file đã không còn, coi như xoá xong
      if (!JSON.stringify(error?.response?.data || '').includes('not_found')) throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const token = await this.getAccessToken()
    const response = await this.http.post<ArrayBuffer>(`${DROPBOX_CONTENT_API}/files/download`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': this.apiArg({ path: this.toRemotePath(objectKey) }),
      },
      responseType: 'arraybuffer',
    })
    return Buffer.from(response.data)
  }

  async list(prefix: string, cursor?: string, limit = 500): Promise<StorageListResult> {
    const token = await this.getAccessToken()

    const response = cursor
      ? await this.http.post(
          `${DROPBOX_API}/files/list_folder/continue`,
          { cursor },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        )
      : await this.http.post(
          `${DROPBOX_API}/files/list_folder`,
          { path: this.toRemotePath(prefix || ''), limit, recursive: false },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        )

    const objects: StorageListResult['objects'] = []
    const prefixes: string[] = []

    for (const entry of response.data.entries || []) {
      const relative = this.toObjectKey(entry.path_display || entry.path_lower)
      if (entry['.tag'] === 'folder') {
        prefixes.push(relative)
        continue
      }
      objects.push({
        objectKey: relative,
        name: entry.name,
        size: Number(entry.size || 0),
        checksum: entry.content_hash,
        modifiedAt: entry.server_modified ? new Date(entry.server_modified) : undefined,
      })
    }

    return { objects, prefixes, cursor: response.data.has_more ? response.data.cursor : null }
  }

  async getUsage(): Promise<StorageUsage> {
    const token = await this.getAccessToken()
    const response = await this.http.post(`${DROPBOX_API}/users/get_space_usage`, null, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const allocation = response.data?.allocation || {}
    let totalBytes: number | null = null
    let usedBytes = Number(response.data?.used || 0)

    if (allocation['.tag'] === 'team') {
      // Tài khoản team: dùng số của team, và nếu user bị giới hạn riêng trong team thì ưu tiên số đó
      totalBytes = Number(allocation.allocated || 0)
      usedBytes = Number(allocation.used ?? usedBytes)
      const userLimit = Number(allocation.user_within_team_space_allocated || 0)
      if (userLimit > 0) {
        totalBytes = userLimit
        usedBytes = Number(allocation.user_within_team_space_used_cached ?? usedBytes)
      }
    } else if (allocation.allocated !== undefined) {
      totalBytes = Number(allocation.allocated)
    }

    return { usedBytes, totalBytes, objectCount: null, source: 'provider_api' }
  }

  /** Link công khai phải tạo qua API nên chỉ có sau khi upload, không suy ra từ key. */
  getPublicUrl(): string | null {
    return null
  }

  async getSignedUrl(objectKey: string): Promise<string | null> {
    const token = await this.getAccessToken()
    try {
      // Link này sống khoảng 4 tiếng và trả thẳng nội dung file
      const response = await this.http.post(
        `${DROPBOX_API}/files/get_temporary_link`,
        { path: this.toRemotePath(objectKey) },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
      return response.data?.link || null
    } catch {
      return null
    }
  }

  async createFolder(folderPath: string): Promise<string | null> {
    const token = await this.getAccessToken()
    try {
      await this.http.post(
        `${DROPBOX_API}/files/create_folder_v2`,
        { path: this.toRemotePath(folderPath), autorename: false },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
    } catch (error: any) {
      // conflict/folder = folder đã tồn tại, đúng ý ta
      if (!JSON.stringify(error?.response?.data || '').includes('conflict')) throw error
    }
    return null
  }

  async deleteFolder(folderPath: string): Promise<void> {
    await this.delete(folderPath)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    const token = await this.getAccessToken()
    await this.http.post(
      `${DROPBOX_API}/files/move_v2`,
      { from_path: this.toRemotePath(fromKey), to_path: this.toRemotePath(toKey), autorename: false },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    )
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  private async uploadSingle(remotePath: string, buffer: Buffer, token: string): Promise<any> {
    const response = await this.http.post(`${DROPBOX_CONTENT_API}/files/upload`, buffer, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': this.apiArg({ path: remotePath, mode: 'overwrite', autorename: false, mute: true }),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })
    return response.data
  }

  private async uploadInChunks(remotePath: string, buffer: Buffer, token: string): Promise<any> {
    const start = await this.http.post(`${DROPBOX_CONTENT_API}/files/upload_session/start`, buffer.subarray(0, CHUNK_SIZE), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': this.apiArg({ close: false }),
      },
      maxBodyLength: Infinity,
    })

    const sessionId = start.data.session_id
    let offset = Math.min(CHUNK_SIZE, buffer.length)

    while (buffer.length - offset > CHUNK_SIZE) {
      await this.http.post(`${DROPBOX_CONTENT_API}/files/upload_session/append_v2`, buffer.subarray(offset, offset + CHUNK_SIZE), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': this.apiArg({ cursor: { session_id: sessionId, offset }, close: false }),
        },
        maxBodyLength: Infinity,
      })
      offset += CHUNK_SIZE
    }

    const finish = await this.http.post(`${DROPBOX_CONTENT_API}/files/upload_session/finish`, buffer.subarray(offset), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': this.apiArg({
          cursor: { session_id: sessionId, offset },
          commit: { path: remotePath, mode: 'overwrite', autorename: false, mute: true },
        }),
      },
      maxBodyLength: Infinity,
    })
    return finish.data
  }

  /** Lấy (hoặc tạo) shared link rồi đổi sang dạng tải thẳng nội dung. */
  private async ensureSharedLink(remotePath: string, token: string): Promise<string | null> {
    // Shared link mặc định mở trang xem trước; raw=1 trả thẳng nội dung file
    const toDirectLink = (url: string) =>
      /[?&]dl=\d/.test(url) ? url.replace(/([?&])dl=\d/, '$1raw=1') : `${url}${url.includes('?') ? '&' : '?'}raw=1`

    try {
      const created = await this.http.post(
        `${DROPBOX_API}/sharing/create_shared_link_with_settings`,
        { path: remotePath },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
      return toDirectLink(created.data.url)
    } catch (error: any) {
      // shared_link_already_exists => lấy lại link cũ
      if (JSON.stringify(error?.response?.data || '').includes('shared_link_already_exists')) {
        try {
          const existing = await this.http.post(
            `${DROPBOX_API}/sharing/list_shared_links`,
            { path: remotePath, direct_only: true },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
          )
          const link = existing.data?.links?.[0]?.url
          return link ? toDirectLink(link) : null
        } catch {
          return null
        }
      }
      // Tài khoản không được phép tạo shared link thì vẫn coi upload là thành công
      return null
    }
  }

  /**
   * Header Dropbox-API-Arg chỉ nhận ASCII, mà tên file tiếng Việt thì không.
   * Escape mọi ký tự ngoài ASCII sang \uXXXX - đây là cách Dropbox yêu cầu.
   */
  private apiArg(value: Record<string, any>): string {
    const json = JSON.stringify(value)
    let escaped = ''
    for (let index = 0; index < json.length; index += 1) {
      const code = json.charCodeAt(index)
      // Duyệt theo UTF-16 unit nên ký tự astral (emoji) tự thành 2 escape, đúng chuẩn JSON.
      escaped += code > 0x7e ? '\\u' + code.toString(16).padStart(4, '0') : json[index]
    }
    return escaped
  }

  private toRemotePath(objectKey: string): string {
    const root = String(this.config.root_path || '').replace(/^\/+|\/+$/g, '')
    const key = String(objectKey || '').replace(/^\/+|\/+$/g, '')
    const joined = [root, key].filter(Boolean).join('/')
    // Dropbox dùng '' cho thư mục gốc, không phải '/'
    return joined ? `/${joined}` : ''
  }

  private toObjectKey(remotePath: string): string {
    const root = String(this.config.root_path || '').replace(/^\/+|\/+$/g, '')
    let key = String(remotePath || '').replace(/^\/+/, '')
    if (root && key.toLowerCase().startsWith(`${root.toLowerCase()}/`)) key = key.slice(root.length + 1)
    return key
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const parts = ['dropbox', this.config.app_key, this.config.app_secret, this.config.refresh_token]
    if (forceRefresh) oauthTokenCache.invalidate(parts)

    return oauthTokenCache.get(parts, async () => {
      const response = await this.http.post(
        DROPBOX_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refresh_token,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: this.config.app_key, password: this.config.app_secret },
        },
      )
      return { accessToken: response.data.access_token, expiresInSeconds: Number(response.data.expires_in || 14400) }
    })
  }

  private describeError(error: any): string {
    const data = error?.response?.data
    const raw = typeof data === 'string' ? data : JSON.stringify(data || {})

    if (data?.error === 'invalid_grant' || raw.includes('invalid_grant')) {
      return 'Refresh token không còn hiệu lực, cần kết nối lại Dropbox.'
    }
    if (error?.response?.status === 401) return 'App key / app secret / refresh token không đúng.'
    if (raw.includes('insufficient_space')) return 'Dropbox đã hết dung lượng.'
    if (raw.includes('path/not_found')) return 'Không tìm thấy thư mục gốc đã cấu hình.'

    return data?.error_summary || data?.error_description || error?.message || 'Không kết nối được Dropbox'
  }
}
