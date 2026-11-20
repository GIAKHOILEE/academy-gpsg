import { Role } from '@enums/role.enum'
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { Observable } from 'rxjs'

export interface ClsActorContext {
  userId?: number
  username?: string
  email?: string
  role?: Role
  ip?: string | null
  userAgent?: string | null
}

export const CLS_REQUEST_KEY = 'request'
export const CLS_ACTOR_KEY = 'actor'

/**
 * Lưu request và thông tin user đã xác thực (sau JwtAuthGuard / OptionalJwtAuthGuard)
 * vào CLS context để các service ở tầng sâu (ví dụ audit log, sync từ module khác)
 * luôn biết chính xác ai đang thao tác mà không cần truyền `req` qua nhiều tầng.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http' && this.cls.isActive()) {
      const req = context.switchToHttp().getRequest()
      this.cls.set(CLS_REQUEST_KEY, req)

      const forwardedFor = req?.headers?.['x-forwarded-for']
      const ip = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0]?.trim()
          : req?.ip || req?.socket?.remoteAddress || null

      const actor: ClsActorContext = {
        userId: req?.user?.userId ? Number(req.user.userId) : undefined,
        username: req?.user?.username,
        email: req?.user?.email,
        role: req?.user?.role,
        ip,
        userAgent: typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      }
      this.cls.set(CLS_ACTOR_KEY, actor)
    }

    return next.handle()
  }
}
