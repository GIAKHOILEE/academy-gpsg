import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageFileController } from './controllers/storage-file.controller'
import { StorageFolderController } from './controllers/storage-folder.controller'
import { StorageOverviewController } from './controllers/storage-overview.controller'
import { StorageProviderController } from './controllers/storage-provider.controller'
import { StorageFileEntity } from './entities/storage-file.entity'
import { StorageFolderEntity } from './entities/storage-folder.entity'
import { StorageProviderEntity } from './entities/storage-provider.entity'
import { StorageSettingEntity } from './entities/storage-setting.entity'
import { StorageCryptoService } from './services/storage-crypto.service'
import { StorageDriverFactory } from './services/storage-driver.factory'
import { StorageFileService } from './services/storage-file.service'
import { StorageFolderService } from './services/storage-folder.service'
import { StorageProviderSeeder } from './services/storage-provider.seeder'
import { StorageProviderService } from './services/storage-provider.service'
import { StorageReferenceService } from './services/storage-reference.service'
import { StorageRouterService } from './services/storage-router.service'
import { StorageService } from './services/storage.service'
import { StorageUsageService } from './services/storage-usage.service'

@Module({
  imports: [TypeOrmModule.forFeature([StorageProviderEntity, StorageFolderEntity, StorageFileEntity, StorageSettingEntity])],
  controllers: [StorageProviderController, StorageFileController, StorageFolderController, StorageOverviewController],
  providers: [
    StorageCryptoService,
    StorageDriverFactory,
    StorageProviderService,
    StorageRouterService,
    StorageUsageService,
    StorageReferenceService,
    StorageFolderService,
    StorageFileService,
    StorageService,
    StorageProviderSeeder,
  ],
  // StorageService là cửa duy nhất các module khác nên dùng; phần còn lại là nội bộ
  // StorageDriverFactory mở cho StorageHubModule dựng driver hvm từ provider đã lưu
  exports: [StorageService, StorageProviderService, StorageFileService, StorageUsageService, StorageDriverFactory],
})
export class StorageModule {}
