import { Module } from '@nestjs/common'
import { StorageModule } from '../storage.module'
import { StorageHubController } from './storage-hub.controller'
import { StorageHubService } from './storage-hub.service'

/**
 * Cầu nối giữa trình duyệt và hvm-storage: đổi API key (giữ ở server) lấy hub token
 * ngắn hạn cho người dùng đã đăng nhập. Tách module riêng để StorageModule không
 * phải biết tới khái niệm "phiên làm việc" của một dịch vụ cụ thể.
 */
@Module({
  imports: [StorageModule],
  controllers: [StorageHubController],
  providers: [StorageHubService],
  exports: [StorageHubService],
})
export class StorageHubModule {}
