import { Role } from '@enums/role.enum'
import { StorageDriver } from '@enums/storage.enum'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { HvmPermission, HvmStorageDriver } from '../drivers/hvm.driver'
import { StorageDriverFactory } from '../services/storage-driver.factory'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageService } from '../services/storage.service'

/** Người dùng đã đăng nhập, đúng hình dạng req.user do JwtStrategy trả về. */
export interface HubUser {
  userId: number | string
  role: Role
  username?: string
  email?: string
}

export interface HubSession {
  hubUrl: string
  token: string
  expiresAt: string
  deliveryOrigin: string
  permissions: HvmPermission[]
}

/** Token sống 1 giờ theo hợp đồng; cấp lại khi còn dưới 5 phút. */
export const HUB_SESSION_TTL_SECONDS = 3600
export const HUB_REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000

/**
 * Quyền trên hub theo vai trò. Học viên và giảng viên chỉ được xem: mọi upload của
 * họ đi qua backend (admin/upload*) để còn kiểm soát dung lượng và tần suất.
 */
const PERMISSIONS_BY_ROLE: Record<number, HvmPermission[]> = {
  [Role.SUPER_ADMIN]: ['read', 'upload', 'write', 'delete'],
  [Role.ADMIN]: ['read', 'upload', 'write', 'delete'],
  [Role.STAFF]: ['read', 'upload', 'write', 'delete'],
  [Role.FINANCE]: ['read', 'upload', 'write', 'delete'],
  [Role.TEACHER]: ['read'],
  [Role.STUDENT]: ['read'],
}

interface CachedSession {
  session: HubSession
  providerId: number
  role: Role
  expiresAtMs: number
}

@Injectable()
export class StorageHubService {
  private readonly logger = new Logger(StorageHubService.name)
  private readonly cache = new Map<string, CachedSession>()

  constructor(
    private readonly providerService: StorageProviderService,
    private readonly driverFactory: StorageDriverFactory,
    private readonly storageService: StorageService,
  ) {}

  static permissionsFor(role: Role): HvmPermission[] {
    return PERMISSIONS_BY_ROLE[Number(role)] || ['read']
  }

  async getSession(user: HubUser): Promise<HubSession> {
    if (!user || user.userId === undefined || user.userId === null) {
      throw new ServiceUnavailableException('Không xác định được người dùng để cấp phiên làm việc với hvm-storage.')
    }

    const provider = await this.providerService.findEnabledByDriver(StorageDriver.HVM)
    if (!provider) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình (hoặc đang tắt) dịch vụ HVM Storage. Vào Quản lý lưu trữ bật dịch vụ loại "hvm" rồi thử lại.',
      )
    }

    const key = String(user.userId)
    const cached = this.cache.get(key)
    const now = Date.now()
    if (cached && cached.providerId === provider.id && cached.role === user.role && cached.expiresAtMs - HUB_REFRESH_BEFORE_EXPIRY_MS > now) {
      return cached.session
    }

    const driver = this.driverFactory.create(provider)
    if (!(driver instanceof HvmStorageDriver)) {
      throw new ServiceUnavailableException(`Dịch vụ "${provider.name}" không phải driver hvm.`)
    }

    const permissions = StorageHubService.permissionsFor(user.role)
    let created
    try {
      created = await driver.createSession({
        subject: `${user.role}:${user.userId}`,
        permissions,
        ttlSeconds: HUB_SESSION_TTL_SECONDS,
      })
    } catch (error: any) {
      this.logger.warn(`Không lấy được hub token từ hvm-storage: ${error?.message}`)
      throw new ServiceUnavailableException(`Không lấy được phiên làm việc từ hvm-storage: ${error?.message}`)
    }

    const session: HubSession = {
      hubUrl: created.hubUrl,
      token: created.token,
      expiresAt: created.expiresAt,
      deliveryOrigin: created.deliveryOrigin,
      permissions,
    }

    const expiresAtMs = Date.parse(created.expiresAt)
    this.cache.set(key, {
      session,
      providerId: provider.id,
      role: user.role,
      expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : now + HUB_SESSION_TTL_SECONDS * 1000,
    })
    this.pruneCache(now)
    return session
  }

  /** Xoá file theo URL, đi đúng đường của lệnh xoá cũ (index trước, suy từ URL sau). */
  async deleteByUrl(url: string): Promise<boolean> {
    return this.storageService.deleteByUrl(url)
  }

  /** Dọn cache ngay trong lúc cấp token, khỏi cần timer riêng. */
  private pruneCache(now: number) {
    if (this.cache.size < 500) return
    for (const [key, entry] of this.cache) {
      if (entry.expiresAtMs <= now) this.cache.delete(key)
    }
  }
}
