import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import axios from 'axios'
import { StorageDriver } from '@enums/storage.enum'
import {
  resolveS3Endpoint,
  resolveS3ForcePathStyle,
  resolveS3Region,
  STORAGE_DRIVER_SCHEMA_MAP,
  StorageDriverCapabilities,
} from '../storage.constants'
import {
  IStorageDriver,
  StorageListResult,
  StorageTestResult,
  StorageUploadInput,
  StorageUploadResult,
  StorageUsage,
} from './storage-driver.interface'

/**
 * Driver cho mọi dịch vụ nói giao thức S3. Khác biệt giữa các dịch vụ chỉ nằm ở
 * endpoint / region / path-style, đã được preset lo (xem storage.constants.ts).
 *
 * Riêng Cloudflare R2: nếu có API token thì đọc dung lượng chính xác từ
 * /accounts/{id}/r2/buckets/{bucket}/usage, nhanh hơn nhiều so với cộng dồn từng object.
 */
export class S3StorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.S3).capabilities

  private readonly client: S3Client
  private readonly bucket: string
  private readonly presetId: string
  private readonly endpoint: string

  constructor(
    private readonly config: Record<string, any>,
    private readonly publicBaseUrl?: string,
  ) {
    this.presetId = config.preset || 'custom'
    this.bucket = config.bucket
    this.endpoint = resolveS3Endpoint(this.presetId, config)

    this.client = new S3Client({
      region: resolveS3Region(this.presetId, config),
      endpoint: this.endpoint || undefined,
      forcePathStyle: resolveS3ForcePathStyle(this.presetId, config),
      credentials: {
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
      },
    })
  }

  async test(): Promise<StorageTestResult> {
    try {
      // HeadBucket xác nhận cả credentials, endpoint và quyền trên bucket
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
      return {
        ok: true,
        message: 'Kết nối thành công',
        details: { bucket: this.bucket, endpoint: this.endpoint, preset: this.presetId },
      }
    } catch (error: any) {
      // Một số dịch vụ (Storj, vài bản MinIO) không cho HeadBucket nhưng vẫn list được
      try {
        await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }))
        return {
          ok: true,
          message: 'Kết nối thành công (dịch vụ không hỗ trợ HeadBucket)',
          details: { bucket: this.bucket, endpoint: this.endpoint, preset: this.presetId },
        }
      } catch (listError: any) {
        return {
          ok: false,
          message: this.describeError(listError) || this.describeError(error),
          details: { bucket: this.bucket, endpoint: this.endpoint, preset: this.presetId },
        }
      }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const result = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    )

    return {
      objectKey: input.objectKey,
      url: this.getPublicUrl(input.objectKey),
      size: input.buffer.length,
      checksum: result.ETag ? result.ETag.replace(/"/g, '') : undefined,
    }
  }

  async delete(objectKey: string): Promise<void> {
    // S3 DeleteObject vốn idempotent: key không tồn tại vẫn trả 204
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }))
  }

  async download(objectKey: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }))
    return Buffer.from(await result.Body.transformToByteArray())
  }

  async list(prefix: string, cursor?: string, limit = 1000): Promise<StorageListResult> {
    const normalizedPrefix = prefix ? `${prefix.replace(/\/+$/, '')}/` : ''

    const result = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: normalizedPrefix || undefined,
        Delimiter: '/',
        MaxKeys: limit,
        ContinuationToken: cursor || undefined,
      }),
    )

    const objects = (result.Contents || [])
      // S3 biểu diễn "thư mục rỗng" bằng object key kết thúc bởi / và size 0
      .filter(item => item.Key && !item.Key.endsWith('/'))
      .map(item => ({
        objectKey: item.Key,
        name: item.Key.split('/').pop(),
        size: Number(item.Size || 0),
        checksum: item.ETag ? item.ETag.replace(/"/g, '') : undefined,
        modifiedAt: item.LastModified,
        url: this.getPublicUrl(item.Key),
      }))

    const prefixes = (result.CommonPrefixes || []).map(item => item.Prefix.replace(/\/+$/, '')).filter(Boolean)

    return {
      objects,
      prefixes,
      cursor: result.IsTruncated ? result.NextContinuationToken || null : null,
    }
  }

  async getUsage(): Promise<StorageUsage> {
    // R2 có API usage riêng, chính xác và chỉ 1 request
    if (this.presetId === 'cloudflare_r2' && this.config.cf_api_token && this.config.account_id) {
      const fromApi = await this.getR2UsageFromCloudflareApi()
      if (fromApi) return fromApi
    }

    // Các dịch vụ S3 khác không có API quota => cộng dồn toàn bộ object
    let usedBytes = 0
    let objectCount = 0
    let cursor: string | undefined

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: this.config.usage_prefix || undefined,
          MaxKeys: 1000,
          ContinuationToken: cursor,
        }),
      )
      for (const item of result.Contents || []) {
        usedBytes += Number(item.Size || 0)
        objectCount += 1
      }
      cursor = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (cursor)

    return { usedBytes, totalBytes: null, objectCount, source: 'listing' }
  }

  getPublicUrl(objectKey: string): string | null {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${objectKey.split('/').map(encodeURIComponent).join('/')}`
    }
    return null
  }

  async getSignedUrl(objectKey: string, expiresInSeconds: number): Promise<string | null> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), {
      expiresIn: expiresInSeconds,
    })
  }

  /** S3 không có thư mục thật, thư mục chỉ là prefix của key. */
  async createFolder(): Promise<string | null> {
    return null
  }

  async deleteFolder(path: string): Promise<void> {
    const prefix = `${path.replace(/\/+$/, '')}/`
    let cursor: string | undefined

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: cursor }),
      )
      const keys = (result.Contents || []).map(item => ({ Key: item.Key }))
      if (keys.length) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }))
      }
      cursor = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (cursor)
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    // S3 không có rename: copy rồi xoá bản cũ
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${fromKey}`,
        Key: toKey,
      }),
    )
    await this.delete(fromKey)
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  private async getR2UsageFromCloudflareApi(): Promise<StorageUsage | null> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.config.account_id}/r2/buckets/${this.bucket}/usage`
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.config.cf_api_token}` },
        timeout: 15000,
      })

      const payload = response.data?.result
      if (!payload) return null

      // payloadSize = dung lượng object, metadataSize = metadata kèm theo
      const usedBytes = Number(payload.payloadSize || 0) + Number(payload.metadataSize || 0)
      return {
        usedBytes,
        totalBytes: null,
        objectCount: payload.objectCount !== undefined ? Number(payload.objectCount) : null,
        source: 'provider_api',
      }
    } catch {
      // Token sai / hết quyền thì rơi về cách cộng dồn, không làm hỏng luồng
      return null
    }
  }

  private describeError(error: any): string {
    const name = error?.name || error?.Code
    const message = error?.message || 'Lỗi không xác định'

    if (name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
      return `Không tìm thấy bucket "${this.bucket}" trên endpoint ${this.endpoint}`
    }
    if (name === 'InvalidAccessKeyId') return 'Access Key ID không đúng'
    if (name === 'SignatureDoesNotMatch') return 'Secret Access Key không đúng'
    if (name === 'AccessDenied' || error?.$metadata?.httpStatusCode === 403) {
      return 'Key không có quyền trên bucket này'
    }
    if (name === 'PermanentRedirect') return 'Region hoặc endpoint không khớp với bucket'
    if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
      return `Không phân giải được tên miền endpoint: ${this.endpoint}`
    }
    return message
  }
}
