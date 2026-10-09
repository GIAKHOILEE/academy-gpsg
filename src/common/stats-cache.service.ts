import { Injectable, Logger } from '@nestjs/common'

interface CacheEntry<T> {
  value: T
  // thời điểm dữ liệu được tính xong
  computedAt: number
  // bị đánh dấu cũ do có thao tác ghi dữ liệu liên quan
  stale: boolean
  // promise đang chạy để tính lại (dùng cho single-flight)
  refreshing?: Promise<T>
}

/**
 * Store đặt ở cấp module (không phải cấp instance) để các TypeORM subscriber —
 * vốn do TypeORM khởi tạo chứ không qua Nest DI — vẫn dùng chung được bộ nhớ đệm.
 */
const store = new Map<string, CacheEntry<any>>()

/**
 * Cache in-memory theo kiểu stale-while-revalidate + single-flight.
 *
 * - Còn tươi: trả cache ngay lập tức, 0 query DB.
 * - Đã cũ (hết TTL hoặc bị markStale): vẫn trả cache ngay để API luôn nhanh,
 *   đồng thời tính lại ở nền => lần gọi sau đã có số mới.
 * - Chưa có cache (hoặc quá cũ tới mức không nên dùng): tính thật và chờ.
 * - Single-flight: nhiều request cùng key chỉ bắn đúng 1 query xuống DB, tránh
 *   việc nhiều admin mở dashboard cùng lúc làm nghẽn cả hệ thống.
 */
@Injectable()
export class StatsCacheService {
  private readonly logger = new Logger(StatsCacheService.name)

  /**
   * @param ttlMs      Sau khoảng này thì tự coi là cũ dù không có thao tác ghi nào.
   * @param staleMs    Quá khoảng này thì không trả số cũ nữa mà phải chờ tính lại.
   * @param minRefreshMs Sàn chống tính lại quá dày. Dù có bao nhiêu lượt ghi dữ liệu,
   *                     một key cũng chỉ được tính lại tối đa một lần trong khoảng này.
   */
  async wrap<T>(key: string, producer: () => Promise<T>, ttlMs = 60_000, staleMs = 10 * 60_000, minRefreshMs = 15_000): Promise<T> {
    const now = Date.now()
    const entry = store.get(key) as CacheEntry<T> | undefined

    if (entry && !entry.stale && now - entry.computedAt < ttlMs) return entry.value
    if (entry && entry.stale && now - entry.computedAt < minRefreshMs) return entry.value

    // Cũ nhưng còn dùng được -> trả ngay, refresh ở nền
    if (entry && now - entry.computedAt < staleMs) {
      this.refresh(key, producer).catch(err => this.logger.error(`Refresh nền thất bại cho "${key}": ${err?.message}`))
      return entry.value
    }

    return this.refresh(key, producer)
  }

  private refresh<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const entry = store.get(key) as CacheEntry<T> | undefined
    if (entry?.refreshing) return entry.refreshing

    const refreshing = producer()
      .then(value => {
        store.set(key, { value, computedAt: Date.now(), stale: false })
        return value
      })
      .catch(err => {
        const prev = store.get(key) as CacheEntry<T> | undefined
        if (prev && prev.computedAt > 0) {
          // giữ lại giá trị cũ, chỉ bỏ cờ refreshing để lần sau thử lại
          store.set(key, { value: prev.value, computedAt: prev.computedAt, stale: prev.stale })
          return prev.value
        }
        store.delete(key)
        throw err
      })

    store.set(key, {
      value: entry?.value as T,
      computedAt: entry?.computedAt ?? 0,
      stale: entry?.stale ?? true,
      refreshing,
    })

    return refreshing
  }

  /**
   * Đánh dấu các key theo prefix là đã cũ.
   *
   * Cố ý KHÔNG xoá giá trị: request kế tiếp vẫn được trả lời tức thì bằng số cũ
   * rồi mới tính lại ở nền. Nếu xoá hẳn, lúc nhập điểm hoặc duyệt đơn hàng loạt
   * thì dashboard sẽ lại phải chờ query nặng — đúng thứ đang cần tránh.
   */
  markStale(prefix: string): void {
    for (const [key, entry] of store) {
      if (key.startsWith(prefix)) entry.stale = true
    }
  }

  /** Xoá hẳn cache theo prefix. Chỉ dùng khi số liệu cũ không còn hợp lệ để hiển thị. */
  invalidate(prefix: string): void {
    for (const key of [...store.keys()]) {
      if (key.startsWith(prefix)) store.delete(key)
    }
  }
}

/** Instance dùng chung cho các nơi nằm ngoài Nest DI (TypeORM subscriber). */
export const statsCache = new StatsCacheService()
