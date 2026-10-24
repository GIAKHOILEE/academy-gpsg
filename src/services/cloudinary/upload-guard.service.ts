import { HttpException, HttpStatus, Injectable, PayloadTooLargeException } from '@nestjs/common'
import * as crypto from 'crypto'
import {
  DEDUPE_WINDOW_MS,
  formatMb,
  maxFileSizeFor,
  maxFilesPerBatchFor,
  RATE_LIMIT_BYTES,
  RATE_LIMIT_UPLOADS,
} from './upload-limits'

/** Người gọi upload: đúng hình dạng req.user của JwtStrategy. */
export interface UploadActor {
  userId: number | string
  role: number
}

interface UploadEvent {
  at: number
  bytes: number
}

interface DedupeEntry {
  url: string
  at: number
}

/**
 * Ba lớp chống lạm dụng cho upload qua backend, giữ trạng thái trong bộ nhớ:
 *
 * 1. Kích thước file theo vai trò (học viên/giảng viên 25 MB, quản trị 500 MB).
 * 2. Tần suất theo người dùng: cửa sổ trượt theo số lần và theo tổng byte.
 * 3. Chống gửi lặp: cùng người dùng, cùng sha256 nội dung trong 10 phút thì trả
 *    lại URL lần trước, không upload lại.
 *
 * Trạng thái mất khi restart - chấp nhận được, vì đây là lớp chống lạm dụng chứ
 * không phải hạn mức có hợp đồng. Chạy nhiều instance thì mỗi instance đếm riêng.
 */
@Injectable()
export class UploadGuardService {
  private readonly events = new Map<string, UploadEvent[]>()
  private readonly recent = new Map<string, DedupeEntry>()

  /** Nguồn thời gian, tách ra để test điều khiển được (không đưa vào constructor vì Nest DI). */
  now: () => number = () => Date.now()

  /* ------------------------------ kích thước ------------------------------ */

  /** Ném 413 nếu có file vượt mức cho vai trò, hoặc batch quá dài. */
  assertSizes(actor: UploadActor, files: Express.Multer.File[]): void {
    const maxFiles = maxFilesPerBatchFor(actor?.role)
    if (files.length > maxFiles) {
      throw new HttpException(`Mỗi lần chỉ được tải lên tối đa ${maxFiles} file.`, HttpStatus.BAD_REQUEST)
    }

    const limit = maxFileSizeFor(actor?.role)
    for (const file of files) {
      const size = this.sizeOf(file)
      if (size > limit) {
        throw new PayloadTooLargeException(`File "${file.originalname}" nặng ${formatMb(size)}, vượt mức cho phép ${formatMb(limit)}.`)
      }
    }
  }

  /* ------------------------------ tần suất ------------------------------ */

  /**
   * Ném 429 nếu người dùng này đã vượt số lần hoặc tổng byte trong cửa sổ,
   * tính cả lô file đang xin tải. Không ghi nhận gì - gọi `record` sau khi upload xong.
   */
  assertRate(actor: UploadActor, files: Express.Multer.File[]): void {
    const key = this.keyOf(actor)
    const now = this.now()
    const history = this.prune(key, now)

    const incomingBytes = files.reduce((sum, file) => sum + this.sizeOf(file), 0)

    const countInWindow = history.filter(event => now - event.at < RATE_LIMIT_UPLOADS.windowMs).length
    if (countInWindow + files.length > RATE_LIMIT_UPLOADS.max) {
      const retryMs = this.retryAfterMs(history, now, RATE_LIMIT_UPLOADS.windowMs)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Bạn đã tải lên quá ${RATE_LIMIT_UPLOADS.max} lần trong ${RATE_LIMIT_UPLOADS.windowMs / 60000} phút. Thử lại sau khoảng ${Math.ceil(retryMs / 60000)} phút.`,
          retryAfterSeconds: Math.ceil(retryMs / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const bytesInWindow = history
      .filter(event => now - event.at < RATE_LIMIT_BYTES.windowMs)
      .reduce((sum, event) => sum + event.bytes, 0)
    if (bytesInWindow + incomingBytes > RATE_LIMIT_BYTES.max) {
      const retryMs = this.retryAfterMs(history, now, RATE_LIMIT_BYTES.windowMs)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Bạn đã tải lên quá ${formatMb(RATE_LIMIT_BYTES.max)} trong ${RATE_LIMIT_BYTES.windowMs / 3600000} giờ. Thử lại sau khoảng ${Math.ceil(retryMs / 60000)} phút.`,
          retryAfterSeconds: Math.ceil(retryMs / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  /** Ghi nhận các file đã upload thành công vào lịch sử của người dùng. */
  record(actor: UploadActor, files: Express.Multer.File[]): void {
    const key = this.keyOf(actor)
    const now = this.now()
    const history = this.prune(key, now)
    for (const file of files) history.push({ at: now, bytes: this.sizeOf(file) })
    this.events.set(key, history)
  }

  /* ------------------------------ chống lặp ------------------------------ */

  hashOf(file: Express.Multer.File): string {
    return crypto.createHash('sha256').update(file.buffer).digest('hex')
  }

  /** URL của lần tải trước nếu cùng người dùng vừa gửi đúng nội dung này, không thì null. */
  findDuplicate(actor: UploadActor, hash: string): string | null {
    const key = `${this.keyOf(actor)}:${hash}`
    const entry = this.recent.get(key)
    if (!entry) return null
    if (this.now() - entry.at >= DEDUPE_WINDOW_MS) {
      this.recent.delete(key)
      return null
    }
    return entry.url
  }

  remember(actor: UploadActor, hash: string, url: string): void {
    const now = this.now()
    this.recent.set(`${this.keyOf(actor)}:${hash}`, { url, at: now })
    // Dọn dần để map không phình vô hạn
    if (this.recent.size > 5000) {
      for (const [key, entry] of this.recent) {
        if (now - entry.at >= DEDUPE_WINDOW_MS) this.recent.delete(key)
      }
    }
  }

  /* ------------------------------ private ------------------------------ */

  private keyOf(actor: UploadActor): string {
    return String(actor?.userId ?? 'anonymous')
  }

  private sizeOf(file: Express.Multer.File): number {
    return Number(file?.size ?? file?.buffer?.length ?? 0)
  }

  /** Bỏ các sự kiện đã rơi khỏi cửa sổ dài nhất; trả về danh sách còn lại. */
  private prune(key: string, now: number): UploadEvent[] {
    const longest = Math.max(RATE_LIMIT_UPLOADS.windowMs, RATE_LIMIT_BYTES.windowMs)
    const kept = (this.events.get(key) || []).filter(event => now - event.at < longest)
    if (kept.length) this.events.set(key, kept)
    else this.events.delete(key)
    return kept
  }

  /** Còn bao lâu nữa thì sự kiện cũ nhất trong cửa sổ rơi ra ngoài. */
  private retryAfterMs(history: UploadEvent[], now: number, windowMs: number): number {
    const inWindow = history.filter(event => now - event.at < windowMs)
    if (!inWindow.length) return 0
    const oldest = Math.min(...inWindow.map(event => event.at))
    return Math.max(oldest + windowMs - now, 1000)
  }
}
