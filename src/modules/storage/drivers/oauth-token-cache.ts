import * as crypto from 'crypto'

interface CachedToken {
  accessToken: string
  /** Mốc thời gian (ms) token hết hạn, đã trừ sẵn biên an toàn. */
  expiresAt: number
}

/**
 * Cache access token theo bộ credential.
 *
 * Driver được khởi tạo lại mỗi request (factory đọc config từ DB), nếu không cache
 * thì mỗi lần upload sẽ gọi thêm 1 request đổi refresh token -> access token.
 * Khoá cache là hash của credential nên đổi key là cache tự mất hiệu lực.
 */
class OAuthTokenCache {
  private readonly tokens = new Map<string, CachedToken>()

  /** Lấy token còn hiệu lực, hoặc gọi `fetcher` để lấy mới rồi cache lại. */
  async get(credentialParts: (string | undefined)[], fetcher: () => Promise<{ accessToken: string; expiresInSeconds: number }>): Promise<string> {
    const key = crypto
      .createHash('sha256')
      .update(credentialParts.map(part => part ?? '').join('|'))
      .digest('hex')

    const cached = this.tokens.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.accessToken

    const fresh = await fetcher()
    this.tokens.set(key, {
      accessToken: fresh.accessToken,
      // Trừ 60s để không dùng token sắp hết hạn giữa lúc request đang bay
      expiresAt: Date.now() + Math.max(fresh.expiresInSeconds - 60, 30) * 1000,
    })
    return fresh.accessToken
  }

  /** Bỏ cache của một bộ credential (dùng khi test kết nối, muốn ép lấy token mới). */
  invalidate(credentialParts: (string | undefined)[]): void {
    const key = crypto
      .createHash('sha256')
      .update(credentialParts.map(part => part ?? '').join('|'))
      .digest('hex')
    this.tokens.delete(key)
  }

  clear(): void {
    this.tokens.clear()
  }
}

export const oauthTokenCache = new OAuthTokenCache()
