import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { StatsCacheService } from './stats-cache.service'

export const DASHBOARD_CACHE_PREFIX = 'dashboard:'

/**
 * Đánh dấu cache thống kê là cũ sau mỗi request có ghi dữ liệu thành công.
 *
 * Vì sao không dùng TypeORM EntitySubscriber: TypeORM chỉ phát sự kiện
 * afterInsert/afterUpdate cho đường `save()`. Các chỗ gọi `repository.update()`,
 * `.delete()`, `.softDelete()` — vốn rải rác khắp class.service, enrollments.service,
 * homeworks.service — hoàn toàn không phát sự kiện, nên subscriber sẽ bỏ sót.
 * Chặn ở tầng HTTP thì mọi thao tác ghi qua API đều được tính, không sót đường nào.
 *
 * Việc đánh dấu rộng tay (kể cả request không liên quan dashboard) là chấp nhận
 * được vì hai lý do: markStale không xoá dữ liệu nên API vẫn trả lời tức thì, và
 * `wrap()` có sàn `minRefreshMs` nên dù có bao nhiêu lượt ghi thì cũng chỉ tính
 * lại tối đa một lần trong mỗi khoảng đó.
 */
@Injectable()
export class StatsCacheInterceptor implements NestInterceptor {
  private static readonly MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  constructor(private readonly statsCache: StatsCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle()

    const method = context.switchToHttp().getRequest()?.method
    if (!StatsCacheInterceptor.MUTATING_METHODS.has(method)) return next.handle()

    // Chỉ đánh dấu khi request đi tới cùng mà không ném lỗi
    return next.handle().pipe(tap(() => this.statsCache.markStale(DASHBOARD_CACHE_PREFIX)))
  }
}
