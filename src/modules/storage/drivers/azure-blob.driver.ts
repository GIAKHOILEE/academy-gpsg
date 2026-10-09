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

/**
 * Driver Azure Blob Storage, xác thực bằng SAS token.
 *
 * Chọn SAS thay vì Shared Key để không phải tự ký từng request (Shared Key yêu cầu
 * canonicalize header + HMAC-SHA256 theo đúng thứ tự, rất dễ sai). SAS chỉ cần
 * ghép vào query string nên hành vi ổn định và người dùng chỉ việc dán.
 *
 * Azure không có API quota cho blob storage (dung lượng gần như không giới hạn,
 * tính tiền theo mức dùng), nên dung lượng được cộng dồn từ List Blobs.
 */
export class AzureBlobStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.AZURE_BLOB).capabilities

  private readonly http: AxiosInstance
  private readonly containerUrl: string
  private readonly sas: string

  constructor(
    private readonly config: Record<string, any>,
    private readonly publicBaseUrl?: string,
  ) {
    this.http = axios.create({ timeout: 120000 })
    this.containerUrl = `https://${config.account_name}.blob.core.windows.net/${config.container}`
    // Người dùng có thể dán kèm dấu ? ở đầu hoặc không
    this.sas = String(config.sas_token || '').replace(/^\?+/, '')
  }

  async test(): Promise<StorageTestResult> {
    try {
      // List 1 blob là đủ để xác nhận container tồn tại và SAS có quyền List
      await this.http.get(`${this.containerUrl}?${this.sas}&restype=container&comp=list&maxresults=1`)
      return {
        ok: true,
        message: 'Kết nối thành công',
        details: { account: this.config.account_name, container: this.config.container },
      }
    } catch (error: any) {
      return { ok: false, message: this.describeError(error) }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const response = await this.http.put(this.blobUrl(input.objectKey), input.buffer, {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': input.mimeType || 'application/octet-stream',
        'Content-Length': String(input.buffer.length),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    return {
      objectKey: input.objectKey,
      url: this.getPublicUrl(input.objectKey),
      size: input.buffer.length,
      checksum: response.headers?.['content-md5'] || String(response.headers?.etag || '').replace(/"/g, '') || undefined,
    }
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await this.http.delete(this.blobUrl(objectKey))
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const response = await this.http.get<ArrayBuffer>(this.blobUrl(objectKey), { responseType: 'arraybuffer' })
    return Buffer.from(response.data)
  }

  async list(prefix: string, cursor?: string, limit = 1000): Promise<StorageListResult> {
    const normalizedPrefix = prefix ? `${prefix.replace(/\/+$/, '')}/` : ''
    const params = new URLSearchParams({
      restype: 'container',
      comp: 'list',
      delimiter: '/',
      maxresults: String(limit),
    })
    if (normalizedPrefix) params.set('prefix', normalizedPrefix)
    if (cursor) params.set('marker', cursor)

    const response = await this.http.get<string>(`${this.containerUrl}?${this.sas}&${params.toString()}`, {
      responseType: 'text',
    })

    const xml = response.data
    const objects: StorageListResult['objects'] = []

    for (const blobXml of this.matchAll(xml, /<Blob>([\s\S]*?)<\/Blob>/g)) {
      const name = this.tagValue(blobXml, 'Name')
      if (!name) continue
      objects.push({
        objectKey: name,
        name: name.split('/').pop(),
        size: Number(this.tagValue(blobXml, 'Content-Length') || 0),
        mimeType: this.tagValue(blobXml, 'Content-Type') || undefined,
        checksum: this.tagValue(blobXml, 'Etag')?.replace(/"/g, '') || undefined,
        modifiedAt: this.tagValue(blobXml, 'Last-Modified') ? new Date(this.tagValue(blobXml, 'Last-Modified')) : undefined,
        url: this.getPublicUrl(name),
      })
    }

    const prefixes = this.matchAll(xml, /<BlobPrefix>([\s\S]*?)<\/BlobPrefix>/g)
      .map(block => this.tagValue(block, 'Name'))
      .filter(Boolean)
      .map(value => value.replace(/\/+$/, ''))

    return { objects, prefixes, cursor: this.tagValue(xml, 'NextMarker') || null }
  }

  async getUsage(): Promise<StorageUsage> {
    let usedBytes = 0
    let objectCount = 0
    let marker: string | null = null

    // Liệt kê phẳng toàn bộ container (không delimiter) để cộng dồn
    do {
      const params = new URLSearchParams({ restype: 'container', comp: 'list', maxresults: '5000' })
      if (marker) params.set('marker', marker)

      const response = await this.http.get<string>(`${this.containerUrl}?${this.sas}&${params.toString()}`, {
        responseType: 'text',
      })

      for (const blobXml of this.matchAll(response.data, /<Blob>([\s\S]*?)<\/Blob>/g)) {
        usedBytes += Number(this.tagValue(blobXml, 'Content-Length') || 0)
        objectCount += 1
      }
      marker = this.tagValue(response.data, 'NextMarker') || null
    } while (marker)

    return { usedBytes, totalBytes: null, objectCount, source: 'listing' }
  }

  getPublicUrl(objectKey: string): string | null {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${this.encodeKey(objectKey)}`
    }
    // Chỉ dùng được khi container được đặt ở mức truy cập công khai
    return `${this.containerUrl}/${this.encodeKey(objectKey)}`
  }

  async getSignedUrl(objectKey: string): Promise<string | null> {
    // SAS đã có sẵn chữ ký và thời hạn do người tạo đặt, ghép vào là dùng được
    return this.blobUrl(objectKey)
  }

  /** Azure Blob không có thư mục thật, thư mục chỉ là tiền tố của tên blob. */
  async createFolder(): Promise<string | null> {
    return null
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const prefix = `${folderPath.replace(/\/+$/, '')}/`
    let marker: string | null = null

    do {
      const params = new URLSearchParams({ restype: 'container', comp: 'list', prefix, maxresults: '1000' })
      if (marker) params.set('marker', marker)

      const response = await this.http.get<string>(`${this.containerUrl}?${this.sas}&${params.toString()}`, {
        responseType: 'text',
      })

      const names = this.matchAll(response.data, /<Blob>([\s\S]*?)<\/Blob>/g)
        .map(block => this.tagValue(block, 'Name'))
        .filter(Boolean)

      // Azure không có batch delete qua REST đơn giản, xoá lần lượt
      for (const name of names) await this.delete(name)

      marker = this.tagValue(response.data, 'NextMarker') || null
    } while (marker)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    // Copy Blob trong cùng account là thao tác đồng bộ với blob nhỏ,
    // nhưng vẫn phải chờ trạng thái để chắc chắn trước khi xoá bản cũ
    await this.http.put(this.blobUrl(toKey), null, {
      headers: { 'x-ms-copy-source': this.blobUrl(fromKey) },
    })

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const head = await this.http.head(this.blobUrl(toKey))
      const status = head.headers?.['x-ms-copy-status']
      if (status === 'success' || !status) break
      if (status === 'failed' || status === 'aborted') {
        throw new Error(`Azure copy thất bại: ${head.headers?.['x-ms-copy-status-description'] || status}`)
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    await this.delete(fromKey)
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  private encodeKey(objectKey: string): string {
    return objectKey.split('/').map(encodeURIComponent).join('/')
  }

  private blobUrl(objectKey: string): string {
    return `${this.containerUrl}/${this.encodeKey(objectKey)}?${this.sas}`
  }

  private matchAll(xml: string, pattern: RegExp): string[] {
    return [...xml.matchAll(pattern)].map(match => match[1])
  }

  private tagValue(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
    return match ? match[1] : null
  }

  private describeError(error: any): string {
    const status = error?.response?.status
    const body = typeof error?.response?.data === 'string' ? error.response.data : ''
    const code = body.match(/<Code>(.*?)<\/Code>/)?.[1]

    if (code === 'AuthenticationFailed' || status === 403) {
      return 'SAS token không hợp lệ, đã hết hạn, hoặc thiếu quyền Read/Write/Delete/List.'
    }
    if (code === 'ContainerNotFound' || status === 404) {
      return `Không tìm thấy container "${this.config.container}" trong account "${this.config.account_name}".`
    }
    if (error?.code === 'ENOTFOUND') return `Storage account "${this.config.account_name}" không tồn tại.`

    return body.match(/<Message>([\s\S]*?)<\/Message>/)?.[1]?.split('\n')[0] || error?.message || 'Không kết nối được Azure Blob'
  }
}
