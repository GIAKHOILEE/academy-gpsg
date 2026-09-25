import { Global, Module } from '@nestjs/common'
import { StatsCacheService } from './stats-cache.service'

/**
 * Global để mọi module có ghi dữ liệu ảnh hưởng tới thống kê (ghi danh, lớp,
 * điểm số...) đều gọi được `invalidate()` mà không phải import vòng quanh.
 */
@Global()
@Module({
  providers: [StatsCacheService],
  exports: [StatsCacheService],
})
export class StatsCacheModule {}
