import { StorageDriver } from '@enums/storage.enum'
import axios, { AxiosInstance } from 'axios'
import { STORAGE_DRIVER_SCHEMA_MAP, StorageDriverCapabilities } from '../storage.constants'
import {
  IStorageDriver,
  StorageListResult,
  StorageTestResult,
  StorageUploadInput,
  StorageUploadResult,
  StorageUsage,
} from './storage-driver.interface'

const BUNNY_CORE_API = 'https://api.bunny.net'
const DEFAULT_HOSTNAME = 'storage.bunnycdn.com'

/**
 * Driver Bunny.net Edge Storage.
 *
 * Thao tác file chỉ cần AccessKey của storage zone. Riêng dung lượng đã dùng phải
 * hỏi Core API bằng Account API key - đó là lý do có 2 key khác nhau trong cấu hình.
 * Không có account key thì rơi về cách cộng dồn từ danh sách file.
 */
export class BunnyStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.BUNNY).capabilities

  private readonly http: AxiosInstance
  private readonly baseUrl: string

  constructor(
    private readonly config: Record<string, any>,
    private readonly publicBaseUrl?: string,
  ) {
    this.http = axios.create({ timeout: 120000 })
    const hostname = String(config.hostname || DEFAULT_HOSTNAME)
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
    this.baseUrl = `https://${hostname}/${config.storage_zone}`
  }

  async test(): Promise<StorageTestResult> {
    try {
      // Liệt kê thư mục gốc để xác nhận zone và AccessKey đúng
      await this.http.get(`${this.baseUrl}/${this.prefixPath('')}`, { headers: this.storageHeaders() })

      const usage = await this.getUsage()
      return {
        ok: true,
        message:
          usage.source === 'provider_api'
            ? 'Kết nối thành công'
            : 'Kết nối thành công (chưa có Account API key nên dung lượng được cộng dồn từ danh sách file)',
        details: {
          storage_zone: this.config.storage_zone,
          used_bytes: usage.usedBytes,
          object_count: usage.objectCount,
          usage_source: usage.source,
        },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    // Bunny tự tạo thư mục trung gian khi PUT vào đường dẫn sâu
    await this.http.put(`${this.baseUrl}/${this.prefixPath(input.objectKey)}`, input.buffer, {
      headers: { ...this.storageHeaders(), 'Content-Type': 'application/octet-stream' },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    return {
      objectKey: input.objectKey,
      url: this.getPublicUrl(input.objectKey),
      size: input.buffer.length,
    }
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await this.http.delete(`${this.baseUrl}/${this.prefixPath(objectKey)}`, { headers: this.storageHeaders() })
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const response = await this.http.get<ArrayBuffer>(`${this.baseUrl}/${this.prefixPath(objectKey)}`, {
      headers: this.storageHeaders(),
      responseType: 'arraybuffer',
    })
    return Buffer.from(response.data)
  }

  async list(prefix: string, _cursor?: string, limit = 1000): Promise<StorageListResult> {
    const path = this.prefixPath(prefix)
    const response = await this.http.get(`${this.baseUrl}/${path ? `${path}/` : ''}`, {
      headers: this.storageHeaders(),
    })

    const objects: StorageListResult['objects'] = []
    const prefixes: string[] = []

    for (const entry of response.data || []) {
      const key = prefix ? `${prefix}/${entry.ObjectName}` : entry.ObjectName
      if (entry.IsDirectory) {
        prefixes.push(key)
        continue
      }
      if (objects.length >= limit) break
      objects.push({
        objectKey: key,
        name: entry.ObjectName,
        size: Number(entry.Length || 0),
        mimeType: entry.ContentType || undefined,
        checksum: entry.Checksum || undefined,
        modifiedAt: entry.LastChanged ? new Date(entry.LastChanged) : undefined,
        url: this.getPublicUrl(key),
      })
    }

    // API Bunny trả hết nội dung 1 thư mục trong 1 lần, không phân trang
    return { objects, prefixes, cursor: null }
  }

  async getUsage(): Promise<StorageUsage> {
    if (this.config.account_api_key) {
      const fromApi = await this.getUsageFromCoreApi()
      if (fromApi) return fromApi
    }

    // Không có account key: đi đệ quy toàn bộ thư mục và cộng dồn
    let usedBytes = 0
    let objectCount = 0

    const walk = async (prefix: string) => {
      const result = await this.list(prefix)
      for (const object of result.objects) {
        usedBytes += object.size
        objectCount += 1
      }
      for (const child of result.prefixes) await walk(child)
    }

    await walk('')
    return { usedBytes, totalBytes: null, objectCount, source: 'listing' }
  }

  getPublicUrl(objectKey: string): string | null {
    const base = this.publicBaseUrl
    // Bunny chỉ phục vụ file công khai qua pull zone, không có domain cố định
    // suy ra được từ tên storage zone, nên bắt buộc phải cấu hình URL công khai
    if (!base) return null
    return `${base.replace(/\/+$/, '')}/${this.encodeKey(objectKey)}`
  }

  /** Edge Storage không có link có hạn; giới hạn truy cập làm ở pull zone (token auth). */
  async getSignedUrl(): Promise<string | null> {
    return null
  }

  async createFolder(folderPath: string): Promise<string | null> {
    // Bunny không có API tạo thư mục rỗng; thư mục xuất hiện khi có file bên trong.
    // Upload 1 file giữ chỗ để thư mục hiện ra trong trình quản lý.
    await this.http.put(`${this.baseUrl}/${this.prefixPath(folderPath)}/.keep`, Buffer.from(''), {
      headers: { ...this.storageHeaders(), 'Content-Type': 'application/octet-stream' },
    })
    return null
  }

  async deleteFolder(folderPath: string): Promise<void> {
    // Xoá đường dẫn có dấu / ở cuối là xoá cả thư mục kèm nội dung
    try {
      await this.http.delete(`${this.baseUrl}/${this.prefixPath(folderPath)}/`, { headers: this.storageHeaders() })
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    // Edge Storage không có API copy/move, phải tải về rồi đẩy lên key mới
    const buffer = await this.download(fromKey)
    await this.upload({ buffer, originalName: toKey.split('/').pop(), mimeType: 'application/octet-stream', objectKey: toKey })
    await this.delete(fromKey)
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  private storageHeaders(): Record<string, string> {
    return { AccessKey: this.config.access_key }
  }

  private encodeKey(objectKey: string): string {
    return objectKey.split('/').map(encodeURIComponent).join('/')
  }

  private prefixPath(objectKey: string): string {
    const root = String(this.config.root_path || '').replace(/^\/+|\/+$/g, '')
    const key = String(objectKey || '').replace(/^\/+|\/+$/g, '')
    return [root, key]
      .filter(Boolean)
      .map(part => part.split('/').map(encodeURIComponent).join('/'))
      .join('/')
  }

  private async getUsageFromCoreApi(): Promise<StorageUsage | null> {
    try {
      // Phải tra id numeric của zone từ tên zone trước
      const zones = await this.http.get(`${BUNNY_CORE_API}/storagezone`, {
        headers: { AccessKey: this.config.account_api_key },
      })
      const zone = (zones.data || []).find((item: any) => item.Name === this.config.storage_zone)
      if (!zone) return null

      return {
        usedBytes: zone.StorageUsed !== undefined ? Number(zone.StorageUsed) : null,
        totalBytes: null,
        objectCount: zone.FilesStored !== undefined ? Number(zone.FilesStored) : null,
        source: 'provider_api',
      }
    } catch {
      // Account key sai thì rơi về cách cộng dồn
      return null
    }
  }

  private describeError(error: any): string {
    const status = error?.response?.status

    if (status === 401) return 'AccessKey của storage zone không đúng.'
    if (status === 404) {
      return `Không tìm thấy storage zone "${this.config.storage_zone}". Kiểm tra lại tên zone và hostname theo region.`
    }
    if (error?.code === 'ENOTFOUND') return `Hostname không phân giải được: ${this.baseUrl}`

    return error?.response?.data?.Message || error?.message || 'Không kết nối được Bunny Storage'
  }
}
