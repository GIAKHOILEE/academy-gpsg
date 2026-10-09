import { StorageDriver } from '@enums/storage.enum'
import * as fs from 'fs'
import * as path from 'path'
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

/**
 * Driver lưu file vào thư mục trên máy chủ.
 *
 * Dung lượng còn lại đọc từ fs.statfs (Node >= 18.15 / 19.6; dự án chạy Node 22)
 * nên con số là dung lượng thật của phân vùng ổ đĩa, không phải ước lượng.
 */
export class LocalStorageDriver implements IStorageDriver {
  readonly capabilities: StorageDriverCapabilities = STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.LOCAL).capabilities

  private readonly rootPath: string

  constructor(
    private readonly config: Record<string, any>,
    private readonly publicBaseUrl?: string,
  ) {
    this.rootPath = config.root_path
  }

  async test(): Promise<StorageTestResult> {
    try {
      await fs.promises.mkdir(this.rootPath, { recursive: true })
      // Ghi thử một file tạm để chắc chắn có quyền ghi, không chỉ quyền đọc
      const probe = path.join(this.rootPath, `.write-probe-${Date.now()}`)
      await fs.promises.writeFile(probe, 'ok')
      await fs.promises.unlink(probe)

      const usage = await this.getUsage()
      return {
        ok: true,
        message: 'Thư mục tồn tại và ghi được',
        details: {
          root_path: this.rootPath,
          free_bytes: usage.totalBytes !== null && usage.usedBytes !== null ? usage.totalBytes - usage.usedBytes : null,
        },
      }
    } catch (error: any) {
      if (error?.code === 'EACCES' || error?.code === 'EPERM') {
        return { ok: false, message: `Không có quyền ghi vào ${this.rootPath}` }
      }
      if (error?.code === 'ENOSPC') {
        return { ok: false, message: `Ổ đĩa chứa ${this.rootPath} đã hết dung lượng` }
      }
      return { ok: false, message: error?.message || 'Không truy cập được thư mục' }
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const target = this.resolve(input.objectKey)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })
    await fs.promises.writeFile(target, input.buffer)

    return {
      objectKey: input.objectKey,
      url: this.getPublicUrl(input.objectKey),
      size: input.buffer.length,
    }
  }

  async delete(objectKey: string): Promise<void> {
    const target = this.resolve(objectKey)
    // force: true => file đã mất thì không báo lỗi
    await fs.promises.rm(target, { force: true })
  }

  async download(objectKey: string): Promise<Buffer> {
    return fs.promises.readFile(this.resolve(objectKey))
  }

  async list(prefix: string, _cursor?: string, limit = 1000): Promise<StorageListResult> {
    const dir = this.resolve(prefix || '')
    const objects: StorageRemoteObject[] = []
    const prefixes: string[] = []

    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { objects, prefixes, cursor: null }
      throw error
    }

    for (const entry of entries) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        prefixes.push(key)
        continue
      }
      if (objects.length >= limit) break
      const stat = await fs.promises.stat(path.join(dir, entry.name))
      objects.push({
        objectKey: key,
        name: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime,
        url: this.getPublicUrl(key),
      })
    }

    return { objects, prefixes, cursor: null }
  }

  async getUsage(): Promise<StorageUsage> {
    const stats = await fs.promises.statfs(this.rootPath)

    // bavail là block trống cho user thường; blocks là tổng block của phân vùng
    const totalBytes = Number(stats.blocks) * Number(stats.bsize)
    const availableBytes = Number(stats.bavail) * Number(stats.bsize)

    // Dung lượng thư mục của ta chiếm bao nhiêu thì phải đi đếm, còn "used" của ổ
    // đĩa là tổng mọi thứ trên phân vùng - đó mới là con số quyết định còn ghi được không
    const { bytes, files } = await this.measureDirectory(this.rootPath)

    return {
      usedBytes: totalBytes - availableBytes,
      totalBytes,
      objectCount: files,
      ownBytes: bytes,
      source: 'provider_api',
    }
  }

  getPublicUrl(objectKey: string): string | null {
    const base = this.publicBaseUrl || this.config.public_base_url
    if (!base) return null
    return `${String(base).replace(/\/+$/, '')}/${objectKey.split('/').map(encodeURIComponent).join('/')}`
  }

  /** Thư mục trên ổ đĩa được phục vụ bằng web server, không có link có hạn. */
  async getSignedUrl(): Promise<string | null> {
    return null
  }

  async createFolder(folderPath: string): Promise<string | null> {
    await fs.promises.mkdir(this.resolve(folderPath), { recursive: true })
    return null
  }

  async deleteFolder(folderPath: string): Promise<void> {
    await fs.promises.rm(this.resolve(folderPath), { recursive: true, force: true })
  }

  async move(fromKey: string, toKey: string): Promise<string> {
    const target = this.resolve(toKey)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })
    await fs.promises.rename(this.resolve(fromKey), target)
    return toKey
  }

  /* ------------------------------ private ------------------------------ */

  /**
   * Chặn path traversal: mọi key phải nằm trong rootPath sau khi resolve.
   * Không có bước này thì objectKey kiểu "../../etc/passwd" sẽ ghi/xoá ra ngoài.
   */
  private resolve(objectKey: string): string {
    const target = path.resolve(this.rootPath, objectKey)
    const root = path.resolve(this.rootPath)
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Đường dẫn không hợp lệ: ${objectKey}`)
    }
    return target
  }

  private async measureDirectory(dir: string): Promise<{ bytes: number; files: number }> {
    let bytes = 0
    let files = 0

    const walk = async (current: string) => {
      let entries: fs.Dirent[]
      try {
        entries = await fs.promises.readdir(current, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile()) {
          try {
            const stat = await fs.promises.stat(full)
            bytes += stat.size
            files += 1
          } catch {
            // file bị xoá giữa lúc quét thì bỏ qua
          }
        }
      }
    }

    await walk(dir)
    return { bytes, files }
  }
}
