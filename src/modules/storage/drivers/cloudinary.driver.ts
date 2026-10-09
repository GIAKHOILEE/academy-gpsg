import { StorageDriver } from '@enums/storage.enum'
import axios from 'axios'
import { v2 as cloudinary, ConfigAndUrlOptions } from 'cloudinary'
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
 * Driver Cloudinary.
 *
 * Lưu ý về `objectKey`: Cloudinary định danh file bằng `public_id`, và với
 * resource_type 'raw' thì public_id bao gồm cả phần mở rộng, còn với image/video
 * thì không. Ta lưu `<resource_type>:<public_id>` làm objectKey để xoá/di chuyển
 * về sau không bị nhầm loại resource.
 */
export class CloudinaryStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.CLOUDINARY).capabilities

  /** Truyền config theo từng lệnh để không ảnh hưởng tới cấu hình global của app. */
  private readonly options: ConfigAndUrlOptions

  constructor(private readonly config: Record<string, any>) {
    this.options = {
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    } as ConfigAndUrlOptions
  }

  async test(): Promise<StorageTestResult> {
    try {
      const usage = await this.fetchUsage()
      return {
        ok: true,
        message: 'Kết nối thành công',
        details: {
          cloud_name: this.config.cloud_name,
          plan: usage?.plan,
          storage_used_bytes: usage?.storage?.usage ?? null,
          credits_used: usage?.credits?.usage ?? null,
          credits_limit: usage?.credits?.limit ?? null,
        },
      }
    } catch (error: any) {
      const status = error?.response?.status
      if (status === 401) return { ok: false, message: 'API Key hoặc API Secret không đúng' }
      if (status === 404) return { ok: false, message: `Cloud name "${this.config.cloud_name}" không tồn tại` }
      return { ok: false, message: error?.message || 'Không kết nối được Cloudinary' }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const resourceType = this.resourceTypeFor(input.mimeType)
    // Với raw, public_id phải chứa cả extension nếu muốn URL có extension
    const publicId = resourceType === 'raw' ? input.objectKey : input.objectKey.replace(/\.[^/.]+$/, '')

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            ...this.options,
            resource_type: resourceType,
            public_id: publicId,
            overwrite: true,
          },
          (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
        )
        .end(input.buffer)
    })

    return {
      objectKey: `${resourceType}:${result.public_id}`,
      url: result.secure_url,
      size: Number(result.bytes || input.buffer.length),
      checksum: result.etag,
    }
  }

  async delete(objectKey: string): Promise<void> {
    const { resourceType, publicId } = this.parseKey(objectKey)
    await cloudinary.uploader.destroy(publicId, { ...this.options, resource_type: resourceType, invalidate: true })
  }

  async download(objectKey: string): Promise<Buffer> {
    const url = this.getPublicUrl(objectKey)
    if (!url) throw new Error('Không xác định được URL của file trên Cloudinary')
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 60000 })
    return Buffer.from(response.data)
  }

  async list(prefix: string, cursor?: string, limit = 100): Promise<StorageListResult> {
    const folder = this.joinRoot(prefix)
    const objects: StorageListResult['objects'] = []
    const prefixes = new Set<string>()
    let nextCursor: string | null = null

    // Cloudinary phân tách resource theo loại, phải gọi lần lượt từng loại
    for (const resourceType of ['image', 'video', 'raw'] as const) {
      const response: any = await cloudinary.api.resources({
        ...this.options,
        type: 'upload',
        resource_type: resourceType,
        prefix: folder ? `${folder}/` : undefined,
        max_results: limit,
        next_cursor: cursor || undefined,
      })

      for (const resource of response.resources || []) {
        const relative = folder ? String(resource.public_id).slice(folder.length + 1) : String(resource.public_id)
        // Chỉ lấy file nằm trực tiếp trong folder này; cấp sâu hơn gom thành prefix
        if (relative.includes('/')) {
          prefixes.add(this.stripRoot(`${folder ? `${folder}/` : ''}${relative.split('/')[0]}`))
          continue
        }
        objects.push({
          objectKey: `${resourceType}:${resource.public_id}`,
          name: `${relative}${resourceType === 'raw' ? '' : resource.format ? `.${resource.format}` : ''}`,
          size: Number(resource.bytes || 0),
          mimeType: resource.format ? `${resourceType}/${resource.format}` : undefined,
          checksum: resource.etag,
          modifiedAt: resource.created_at ? new Date(resource.created_at) : undefined,
          url: resource.secure_url,
        })
      }

      if (response.next_cursor) nextCursor = response.next_cursor
    }

    return { objects, prefixes: [...prefixes], cursor: nextCursor }
  }

  async getUsage(): Promise<StorageUsage> {
    const usage = await this.fetchUsage()
    return {
      usedBytes: usage?.storage?.usage !== undefined ? Number(usage.storage.usage) : null,
      // Cloudinary tính hạn mức theo credit chứ không theo byte, nên không có
      // tổng dung lượng tuyệt đối. Hạn mức byte (nếu cần) do bạn tự đặt ở quota_limit_bytes.
      totalBytes: usage?.storage?.limit !== undefined ? Number(usage.storage.limit) : null,
      objectCount: usage?.resources !== undefined ? Number(usage.resources) : null,
      source: 'provider_api',
    }
  }

  getPublicUrl(objectKey: string): string | null {
    const { resourceType, publicId } = this.parseKey(objectKey)
    return cloudinary.url(publicId, { ...this.options, resource_type: resourceType, secure: true })
  }

  /** Cloudinary dùng URL public/signed URL theo transform, không dùng link có hạn kiểu S3. */
  async getSignedUrl(): Promise<string | null> {
    return null
  }

  async createFolder(folderPath: string): Promise<string | null> {
    await cloudinary.api.create_folder(this.joinRoot(folderPath), this.options)
    return null
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const folder = this.joinRoot(folderPath)
    // Phải xoá hết resource bên trong trước, Cloudinary không cho xoá folder còn file
    for (const resourceType of ['image', 'video', 'raw'] as const) {
      await cloudinary.api.delete_resources_by_prefix(`${folder}/`, { ...this.options, resource_type: resourceType })
    }
    await cloudinary.api.delete_folder(folder, this.options)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    const { resourceType, publicId } = this.parseKey(fromKey)
    const target = this.parseKey(toKey).publicId
    const result: any = await cloudinary.uploader.rename(publicId, target, {
      ...this.options,
      resource_type: resourceType,
      overwrite: true,
    })
    return `${resourceType}:${result.public_id}`
  }

  /* ------------------------------ private ------------------------------ */

  private async fetchUsage(): Promise<any> {
    return cloudinary.api.usage(this.options)
  }

  /** Cloudinary chia resource thành image / video / raw; mọi thứ không phải ảnh-video là raw. */
  private resourceTypeFor(mimeType: string): 'image' | 'video' | 'raw' {
    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType?.startsWith('video/') || mimeType?.startsWith('audio/')) return 'video'
    return 'raw'
  }

  private parseKey(objectKey: string): { resourceType: 'image' | 'video' | 'raw'; publicId: string } {
    const separator = objectKey.indexOf(':')
    if (separator > 0) {
      const prefix = objectKey.slice(0, separator)
      if (prefix === 'image' || prefix === 'video' || prefix === 'raw') {
        return { resourceType: prefix, publicId: objectKey.slice(separator + 1) }
      }
    }
    // Key cũ chưa có tiền tố loại resource
    return { resourceType: 'image', publicId: objectKey }
  }

  private joinRoot(folderPath: string): string {
    const root = this.config.folder ? String(this.config.folder).replace(/^\/+|\/+$/g, '') : ''
    const sub = (folderPath || '').replace(/^\/+|\/+$/g, '')
    return [root, sub].filter(Boolean).join('/')
  }

  private stripRoot(fullPath: string): string {
    const root = this.config.folder ? String(this.config.folder).replace(/^\/+|\/+$/g, '') : ''
    if (root && fullPath.startsWith(`${root}/`)) return fullPath.slice(root.length + 1)
    return fullPath
  }
}
