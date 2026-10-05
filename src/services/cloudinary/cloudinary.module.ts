import { StorageModule } from '@modules/storage/storage.module'
import { Module } from '@nestjs/common'
import { UploadController } from './cloudinary.controller'
import { CloudinaryProvider } from './cloudinary.provider'
import { CloudinaryService } from './cloudinary.service'

@Module({
  // CloudinaryService chuyển tiếp việc upload cho StorageService
  imports: [StorageModule],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
  controllers: [UploadController],
})
export class CloudinaryModule {}
