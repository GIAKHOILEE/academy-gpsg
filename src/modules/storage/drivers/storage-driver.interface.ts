import { StorageDriverCapabilities } from '../storage.constants'

/** File cần upload. Dùng chung cho mọi driver. */
export interface StorageUploadInput {
  /** Nội dung file */
  buffer: Buffer
  /** Tên file gốc, dùng để lấy phần mở rộng */
  originalName: string
  mimeType: string
  /** Key đích đã tính sẵn (đã gồm path_prefix và folder). */
  objectKey: string
}

export interface StorageUploadResult {
  /** Định danh thật trên dịch vụ. Với Drive/OneDrive đây là file id, khác với objectKey đề xuất. */
  objectKey: string
  /** URL công khai, null nếu dịch vụ không cho truy cập công khai. */
  url: string | null
  size: number
  checksum?: string
}

/** Một object liệt kê được từ dịch vụ. */
export interface StorageRemoteObject {
  objectKey: string
  name: string
  size: number
  mimeType?: string
  checksum?: string
  modifiedAt?: Date
  url?: string | null
}

export interface StorageListResult {
  objects: StorageRemoteObject[]
  /** Prefix con (chỉ có với driver dạng object storage). */
  prefixes: string[]
  /** Con trỏ trang tiếp theo, null là hết. */
  cursor: string | null
}

export interface StorageUsage {
  /** Dung lượng đang dùng (byte). null = không xác định được. */
  usedBytes: number | null
  /** Tổng dung lượng dịch vụ cho phép (byte). null = dịch vụ không báo / không giới hạn. */
  totalBytes: number | null
  /** Số object. null = không đếm được. */
  objectCount: number | null
  /**
   * Dung lượng do riêng phần của ta chiếm, khi nó khác `usedBytes`.
   * Ví dụ driver Local: `usedBytes` là mức dùng của cả phân vùng ổ đĩa (con số quyết
   * định còn ghi được hay không), còn `ownBytes` là dung lượng thư mục ta quản lý.
   */
  ownBytes?: number | null
  /** Số liệu đến từ đâu: API của dịch vụ, hay do ta liệt kê và cộng dồn. */
  source: 'provider_api' | 'listing'
}

export interface StorageTestResult {
  ok: boolean
  message: string
  /** Thông tin thêm hiện lên UI (tên bucket, email account Drive...). */
  details?: Record<string, any>
}

/**
 * Hợp đồng mà mọi dịch vụ lưu trữ phải thoả. Service tầng trên chỉ làm việc qua
 * interface này nên thêm dịch vụ mới = thêm 1 file driver, không sửa chỗ nào khác.
 */
export interface IStorageDriver {
  readonly capabilities: StorageDriverCapabilities

  /** Kiểm tra cấu hình có dùng được không. Không được throw, luôn trả kết quả. */
  test(): Promise<StorageTestResult>

  upload(input: StorageUploadInput): Promise<StorageUploadResult>

  /** Xoá 1 object. Object không tồn tại thì coi như thành công. */
  delete(objectKey: string): Promise<void>

  /** Tải nội dung về, dùng cho preview/kiểm tra checksum. */
  download(objectKey: string): Promise<Buffer>

  /** Liệt kê object trong 1 thư mục/prefix. */
  list(prefix: string, cursor?: string, limit?: number): Promise<StorageListResult>

  /** Dung lượng đã dùng / tổng dung lượng. */
  getUsage(): Promise<StorageUsage>

  /** URL công khai cố định của object, null nếu không có. */
  getPublicUrl(objectKey: string): string | null

  /** URL tải tạm thời. Driver không hỗ trợ thì trả null. */
  getSignedUrl(objectKey: string, expiresInSeconds: number): Promise<string | null>

  /** Tạo thư mục. Driver dùng prefix (S3/Azure) thì không làm gì và trả null. */
  createFolder(path: string, parentRemoteId?: string): Promise<string | null>

  /** Xoá thư mục cùng toàn bộ nội dung bên trong. */
  deleteFolder(path: string, remoteId?: string): Promise<void>

  /** Đổi tên / di chuyển object. Trả về key mới thật sự. */
  move(fromKey: string, toKey: string): Promise<string>
}
