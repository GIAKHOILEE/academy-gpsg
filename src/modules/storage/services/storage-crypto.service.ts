import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
/** Đánh dấu chuỗi đã mã hoá bởi service này, để nhận ra dữ liệu cũ chưa mã hoá. */
const PREFIX = 'enc.v1:'

/**
 * Mã hoá / giải mã phần config chứa key, secret của các dịch vụ lưu trữ.
 *
 * Dùng AES-256-GCM: mỗi lần mã hoá sinh IV mới, và auth tag đảm bảo dữ liệu bị
 * sửa trong DB sẽ giải mã thất bại chứ không trả ra rác.
 *
 * Khoá lấy từ env STORAGE_ENCRYPTION_KEY. Nếu chưa đặt thì derive từ
 * ACCESS_TOKEN_SECRET để hệ thống chạy được ngay, kèm cảnh báo trong log.
 */
@Injectable()
export class StorageCryptoService {
  private readonly logger = new Logger(StorageCryptoService.name)
  private readonly key: Buffer

  constructor() {
    this.key = this.resolveKey()
  }

  encrypt(plainText: string): string {
    if (plainText === null || plainText === undefined) return null

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  decrypt(cipherText: string): string {
    if (!cipherText) return null

    // Dữ liệu được ghi trước khi bật mã hoá thì trả về nguyên trạng
    if (!cipherText.startsWith(PREFIX)) return cipherText

    const payload = Buffer.from(cipherText.slice(PREFIX.length), 'base64')
    const iv = payload.subarray(0, IV_LENGTH)
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }

  encryptJson(value: Record<string, any>): string {
    return this.encrypt(JSON.stringify(value ?? {}))
  }

  decryptJson(cipherText: string): Record<string, any> {
    if (!cipherText) return {}
    try {
      return JSON.parse(this.decrypt(cipherText)) || {}
    } catch (error) {
      // Sai khoá hoặc dữ liệu bị sửa: không được làm sập app, nhưng phải thấy trong log
      this.logger.error(`Không giải mã được cấu hình dịch vụ lưu trữ: ${error?.message}`)
      return {}
    }
  }

  /** true nếu chuỗi đang ở dạng đã mã hoá bởi service này. */
  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX)
  }

  /* ------------------------------ private ------------------------------ */

  private resolveKey(): Buffer {
    const configured = process.env.STORAGE_ENCRYPTION_KEY

    if (configured) {
      // Cho phép dán key 64 ký tự hex (32 byte) để dùng đúng khoá đó
      if (/^[0-9a-fA-F]{64}$/.test(configured)) return Buffer.from(configured, 'hex')
      // Hoặc dán passphrase bất kỳ, băm về 32 byte
      return crypto.createHash('sha256').update(configured).digest()
    }

    const fallback = process.env.ACCESS_TOKEN_SECRET
    if (fallback) {
      this.logger.warn(
        'STORAGE_ENCRYPTION_KEY chưa được đặt, đang derive khoá từ ACCESS_TOKEN_SECRET. ' +
          'Hãy đặt STORAGE_ENCRYPTION_KEY riêng, vì đổi ACCESS_TOKEN_SECRET sẽ làm mất khả năng giải mã cấu hình đã lưu.',
      )
      return crypto.createHash('sha256').update(`storage:${fallback}`).digest()
    }

    // Không có gì để derive: vẫn chạy được trong môi trường test/dev, nhưng
    // dữ liệu mã hoá sẽ không đọc lại được sau khi restart.
    this.logger.error(
      'Thiếu cả STORAGE_ENCRYPTION_KEY và ACCESS_TOKEN_SECRET. Đang dùng khoá tạm sinh theo tiến trình, ' +
        'cấu hình dịch vụ lưu trữ sẽ KHÔNG giải mã lại được sau khi restart.',
    )
    return crypto.randomBytes(32)
  }
}
