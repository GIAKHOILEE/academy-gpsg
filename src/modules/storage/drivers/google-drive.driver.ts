import { GoogleDriveAuthMode, StorageDriver } from '@enums/storage.enum'
import axios, { AxiosInstance } from 'axios'
import * as crypto from 'crypto'
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

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

/**
 * Driver Google Drive, hỗ trợ 2 cách xác thực:
 *
 * 1. OAuth refresh token của một Google account thật - dùng được cả Gmail miễn phí.
 * 2. Service account. Service account tự nó có dung lượng 0 byte nên KHÔNG upload
 *    vào My Drive được (lỗi storageQuotaExceeded). Hai cách hợp lệ:
 *    - Ghi vào Shared Drive: file trong Shared Drive thuộc về tổ chức, không tính
 *      vào dung lượng của service account. Cần Google Workspace.
 *    - Bật domain-wide delegation rồi impersonate một user thật (`impersonate_subject`).
 *
 * `objectKey` của driver này là file id do Drive cấp, không phải đường dẫn.
 */
export class GoogleDriveStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.GOOGLE_DRIVE).capabilities

  private readonly http: AxiosInstance

  constructor(private readonly config: Record<string, any>) {
    this.http = axios.create({ timeout: 60000 })
  }

  async test(): Promise<StorageTestResult> {
    try {
      const token = await this.getAccessToken(true)
      const about = await this.http.get(`${DRIVE_API}/about`, {
        params: { fields: 'user(displayName,emailAddress),storageQuota' },
        headers: { Authorization: `Bearer ${token}` },
      })

      const quota = about.data?.storageQuota || {}
      const isServiceAccount = this.config.auth_mode === GoogleDriveAuthMode.SERVICE_ACCOUNT
      const hasSharedDrive = Boolean(this.config.shared_drive_id)
      const impersonating = Boolean(this.config.impersonate_subject)

      // Cảnh báo sớm trường hợp chắc chắn sẽ lỗi khi upload
      if (isServiceAccount && !hasSharedDrive && !impersonating) {
        return {
          ok: false,
          message:
            'Service account không có dung lượng riêng nên không upload được vào My Drive. Hãy điền Shared Drive ID, hoặc bật domain-wide delegation rồi điền email user cần impersonate.',
          details: { account: about.data?.user?.emailAddress, storage_quota: quota },
        }
      }

      // Xác nhận folder gốc / shared drive thực sự truy cập được
      if (this.config.shared_drive_id) {
        await this.http.get(`${DRIVE_API}/drives/${this.config.shared_drive_id}`, {
          params: { fields: 'id,name' },
          headers: { Authorization: `Bearer ${token}` },
        })
      }
      if (this.config.root_folder_id) {
        await this.http.get(`${DRIVE_API}/files/${this.config.root_folder_id}`, {
          params: { fields: 'id,name,mimeType', supportsAllDrives: true },
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      return {
        ok: true,
        message: 'Kết nối thành công',
        details: {
          account: about.data?.user?.emailAddress || about.data?.user?.displayName,
          auth_mode: this.config.auth_mode,
          limit_bytes: quota.limit ? Number(quota.limit) : null,
          usage_bytes: quota.usage ? Number(quota.usage) : null,
          usage_in_drive_bytes: quota.usageInDrive ? Number(quota.usageInDrive) : null,
        },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const token = await this.getAccessToken()
    const parents = await this.ensureFolderChain(this.folderOf(input.objectKey), token)
    const name = input.objectKey.split('/').pop()

    const metadata: Record<string, any> = { name, mimeType: input.mimeType }
    if (parents) metadata.parents = [parents]
    else if (this.config.shared_drive_id) metadata.parents = [this.config.shared_drive_id]

    const boundary = `hvm-${crypto.randomBytes(12).toString('hex')}`
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
      Buffer.from(JSON.stringify(metadata)),
      Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${input.mimeType || 'application/octet-stream'}\r\n\r\n`),
      input.buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])

    const response = await this.http.post(`${DRIVE_UPLOAD_API}/files`, body, {
      params: { uploadType: 'multipart', supportsAllDrives: true, fields: 'id,name,size,md5Checksum,webViewLink' },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    const fileId = response.data.id
    // Mở quyền đọc công khai để link dùng được ở frontend
    await this.makePublic(fileId, token)

    return {
      objectKey: fileId,
      url: this.getPublicUrl(fileId),
      size: Number(response.data.size || input.buffer.length),
      checksum: response.data.md5Checksum,
    }
  }

  async delete(objectKey: string): Promise<void> {
    const token = await this.getAccessToken()
    try {
      await this.http.delete(`${DRIVE_API}/files/${objectKey}`, {
        params: { supportsAllDrives: true },
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      // File đã bị xoá trước đó thì coi như xong
      if (error?.response?.status !== 404) throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const token = await this.getAccessToken()
    const response = await this.http.get<ArrayBuffer>(`${DRIVE_API}/files/${objectKey}`, {
      params: { alt: 'media', supportsAllDrives: true },
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    })
    return Buffer.from(response.data)
  }

  async list(prefix: string, cursor?: string, limit = 100): Promise<StorageListResult> {
    const token = await this.getAccessToken()
    const folderId = (await this.findFolderId(prefix, token)) || this.config.root_folder_id || this.config.shared_drive_id || 'root'

    const params: Record<string, any> = {
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id,name,mimeType,size,md5Checksum,modifiedTime)',
      pageSize: limit,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken: cursor || undefined,
    }
    if (this.config.shared_drive_id) {
      params.corpora = 'drive'
      params.driveId = this.config.shared_drive_id
    }

    const response = await this.http.get(`${DRIVE_API}/files`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })

    const objects: StorageListResult['objects'] = []
    const prefixes: string[] = []

    for (const file of response.data.files || []) {
      if (file.mimeType === FOLDER_MIME) {
        prefixes.push(prefix ? `${prefix}/${file.name}` : file.name)
        continue
      }
      objects.push({
        objectKey: file.id,
        name: file.name,
        size: Number(file.size || 0),
        mimeType: file.mimeType,
        checksum: file.md5Checksum,
        modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
        url: this.getPublicUrl(file.id),
      })
    }

    return { objects, prefixes, cursor: response.data.nextPageToken || null }
  }

  async getUsage(): Promise<StorageUsage> {
    const token = await this.getAccessToken()
    const response = await this.http.get(`${DRIVE_API}/about`, {
      params: { fields: 'storageQuota' },
      headers: { Authorization: `Bearer ${token}` },
    })

    const quota = response.data?.storageQuota || {}
    return {
      // usageInDrive là phần Drive chiếm; usage là tổng cả Gmail + Photos
      usedBytes: quota.usage !== undefined ? Number(quota.usage) : null,
      ownBytes: quota.usageInDrive !== undefined ? Number(quota.usageInDrive) : null,
      // Không có `limit` nghĩa là tài khoản không giới hạn dung lượng
      totalBytes: quota.limit !== undefined ? Number(quota.limit) : null,
      objectCount: null,
      source: 'provider_api',
    }
  }

  getPublicUrl(objectKey: string): string | null {
    // Link này trả thẳng nội dung file, dùng được trong thẻ img/video
    return `https://drive.google.com/uc?export=view&id=${objectKey}`
  }

  /** Drive không có link hết hạn như S3; quyền truy cập quản lý bằng permission. */
  async getSignedUrl(): Promise<string | null> {
    return null
  }

  async createFolder(folderPath: string): Promise<string | null> {
    const token = await this.getAccessToken()
    return this.ensureFolderChain(folderPath, token)
  }

  async deleteFolder(folderPath: string, remoteId?: string): Promise<void> {
    const token = await this.getAccessToken()
    const folderId = remoteId || (await this.findFolderId(folderPath, token))
    if (!folderId) return
    // Xoá folder trên Drive là xoá luôn toàn bộ nội dung bên trong
    await this.delete(folderId)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    const token = await this.getAccessToken()
    const name = toKey.split('/').pop()
    const targetFolder = await this.ensureFolderChain(this.folderOf(toKey), token)

    const current = await this.http.get(`${DRIVE_API}/files/${fromKey}`, {
      params: { fields: 'parents', supportsAllDrives: true },
      headers: { Authorization: `Bearer ${token}` },
    })
    const currentParents: string[] = current.data?.parents || []

    await this.http.patch(
      `${DRIVE_API}/files/${fromKey}`,
      { name },
      {
        params: {
          supportsAllDrives: true,
          addParents: targetFolder || undefined,
          removeParents: targetFolder && currentParents.length ? currentParents.join(',') : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    // Drive giữ nguyên file id khi đổi tên / di chuyển
    return fromKey
  }

  /* ------------------------------ private ------------------------------ */

  private folderOf(objectKey: string): string {
    const parts = objectKey.split('/')
    parts.pop()
    return parts.join('/')
  }

  private async makePublic(fileId: string, token: string): Promise<void> {
    try {
      await this.http.post(
        `${DRIVE_API}/files/${fileId}/permissions`,
        { role: 'reader', type: 'anyone' },
        { params: { supportsAllDrives: true }, headers: { Authorization: `Bearer ${token}` } },
      )
    } catch {
      // Shared Drive bị chính sách tổ chức chặn chia sẻ công khai thì bỏ qua,
      // file vẫn upload thành công và truy cập được bằng tài khoản có quyền
    }
  }

  /** Tạo (nếu chưa có) toàn bộ chuỗi folder theo path, trả về id folder cuối. */
  private async ensureFolderChain(folderPath: string, token: string): Promise<string | null> {
    const segments = (folderPath || '').split('/').filter(Boolean)
    let parentId: string = this.config.root_folder_id || this.config.shared_drive_id || null

    for (const segment of segments) {
      const existing = await this.findChildFolder(segment, parentId, token)
      if (existing) {
        parentId = existing
        continue
      }
      const created = await this.http.post(
        `${DRIVE_API}/files`,
        {
          name: segment,
          mimeType: FOLDER_MIME,
          ...(parentId ? { parents: [parentId] } : {}),
        },
        { params: { supportsAllDrives: true, fields: 'id' }, headers: { Authorization: `Bearer ${token}` } },
      )
      parentId = created.data.id
    }

    return parentId
  }

  private async findFolderId(folderPath: string, token: string): Promise<string | null> {
    const segments = (folderPath || '').split('/').filter(Boolean)
    let parentId: string = this.config.root_folder_id || this.config.shared_drive_id || null

    for (const segment of segments) {
      const found = await this.findChildFolder(segment, parentId, token)
      if (!found) return null
      parentId = found
    }
    return parentId
  }

  private async findChildFolder(name: string, parentId: string | null, token: string): Promise<string | null> {
    // Escape dấu ' để tên folder có dấu nháy không làm hỏng câu query
    const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const clauses = [`name = '${safeName}'`, `mimeType = '${FOLDER_MIME}'`, 'trashed = false']
    clauses.push(parentId ? `'${parentId}' in parents` : `'root' in parents`)

    const params: Record<string, any> = {
      q: clauses.join(' and '),
      fields: 'files(id)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    }
    if (this.config.shared_drive_id) {
      params.corpora = 'drive'
      params.driveId = this.config.shared_drive_id
    }

    const response = await this.http.get(`${DRIVE_API}/files`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.files?.[0]?.id || null
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const parts =
      this.config.auth_mode === GoogleDriveAuthMode.SERVICE_ACCOUNT
        ? ['gdrive-sa', this.config.service_account_json, this.config.impersonate_subject]
        : ['gdrive-oauth', this.config.client_id, this.config.client_secret, this.config.refresh_token]

    if (forceRefresh) oauthTokenCache.invalidate(parts)

    return oauthTokenCache.get(parts, async () =>
      this.config.auth_mode === GoogleDriveAuthMode.SERVICE_ACCOUNT ? this.fetchServiceAccountToken() : this.fetchOAuthToken(),
    )
  }

  private async fetchOAuthToken(): Promise<{ accessToken: string; expiresInSeconds: number }> {
    const response = await this.http.post(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        refresh_token: this.config.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return { accessToken: response.data.access_token, expiresInSeconds: Number(response.data.expires_in || 3600) }
  }

  /**
   * Service account: tự ký JWT RS256 rồi đổi lấy access token.
   * Dùng crypto của Node, không cần thêm thư viện googleapis.
   */
  private async fetchServiceAccountToken(): Promise<{ accessToken: string; expiresInSeconds: number }> {
    const key = typeof this.config.service_account_json === 'string' ? JSON.parse(this.config.service_account_json) : this.config.service_account_json

    if (!key?.client_email || !key?.private_key) {
      throw new Error('Service account JSON thiếu client_email hoặc private_key')
    }

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const claims: Record<string, any> = {
      iss: key.client_email,
      scope: DRIVE_SCOPE,
      aud: key.token_uri || GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }
    // Chỉ có domain-wide delegation mới được impersonate user khác
    if (this.config.impersonate_subject) claims.sub = this.config.impersonate_subject

    const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key)
    const assertion = `${unsigned}.${base64url(signature)}`

    const response = await this.http.post(
      key.token_uri || GOOGLE_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return { accessToken: response.data.access_token, expiresInSeconds: Number(response.data.expires_in || 3600) }
  }

  private describeError(error: any): string {
    const data = error?.response?.data
    const reason = data?.error?.errors?.[0]?.reason || data?.error

    if (reason === 'storageQuotaExceeded') {
      return 'Hết dung lượng Drive. Nếu đang dùng service account, hãy ghi vào Shared Drive hoặc impersonate một user thật.'
    }
    if (data?.error === 'invalid_grant') {
      return 'Refresh token không còn hiệu lực (bị thu hồi hoặc đã hết hạn), cần kết nối lại.'
    }
    if (data?.error === 'invalid_client') return 'Client ID hoặc Client Secret không đúng.'
    if (error?.response?.status === 403) {
      return data?.error?.message || 'Không có quyền. Kiểm tra đã bật Google Drive API và đã chia sẻ folder/Shared Drive cho tài khoản này chưa.'
    }
    if (error?.response?.status === 404) return 'Không tìm thấy folder hoặc Shared Drive với ID đã nhập.'

    return data?.error?.message || data?.error_description || error?.message || 'Không kết nối được Google Drive'
  }
}
