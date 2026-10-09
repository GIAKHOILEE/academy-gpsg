import { Global, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { StorageFileController } from '../controllers/storage-file.controller'
import { StorageFolderController } from '../controllers/storage-folder.controller'
import { StorageOverviewController } from '../controllers/storage-overview.controller'
import { StorageProviderController } from '../controllers/storage-provider.controller'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import { StorageCryptoService } from '../services/storage-crypto.service'
import { StorageDriverFactory } from '../services/storage-driver.factory'
import { StorageFileService } from '../services/storage-file.service'
import { StorageFolderService } from '../services/storage-folder.service'
import { StorageProviderSeeder } from '../services/storage-provider.seeder'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageReferenceService } from '../services/storage-reference.service'
import { StorageRouterService } from '../services/storage-router.service'
import { StorageService } from '../services/storage.service'
import { StorageUsageService } from '../services/storage-usage.service'
import { StorageModule } from '../storage.module'

/**
 * Dựng thật StorageModule bằng Nest testing, chỉ thay repository và DataSource
 * bằng bản giả.
 *
 * Unit test ở các file khác đều tự new service nên không chạm tới phần nối dây:
 * thiếu provider, thiếu export, phụ thuộc vòng, hay quên @InjectDataSource đều
 * chỉ lộ ra khi Nest thật sự khởi tạo module - đó là việc của file này.
 */
describe('StorageModule (nối dây DI)', () => {
  const makeRepositoryMock = () => ({
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
    update: jest.fn(async () => undefined),
    softDelete: jest.fn(async () => undefined),
    softRemove: jest.fn(async (value: unknown) => value),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
      getManyAndCount: jest.fn(async () => [[], 0]),
      getRawOne: jest.fn(async () => ({ total: '0' })),
      getRawMany: jest.fn(async () => []),
      alias: 'entity',
    })),
  })

  /** DataSource giả, đủ cho StorageReferenceService dò metadata lúc onModuleInit. */
  const dataSourceMock = {
    entityMetadatas: [
      {
        name: 'User',
        tableName: 'users',
        primaryColumns: [{ databaseName: 'id' }],
        columns: [
          { databaseName: 'id', type: 'int' },
          { databaseName: 'avatar', type: 'varchar' },
        ],
      },
    ],
    query: jest.fn(async () => []),
  }

  /**
   * Trong app thật, DataSource do TypeOrmModule.forRoot cấp qua một module
   * @Global nên mọi module đều thấy. Module giả này mô phỏng đúng cơ chế đó,
   * nhờ vậy test vẫn kiểm được @InjectDataSource có hoạt động hay không.
   */
  @Global()
  @Module({
    providers: [{ provide: getDataSourceToken(), useValue: dataSourceMock as unknown as DataSource }],
    exports: [getDataSourceToken()],
  })
  class FakeDataSourceModule {}

  const buildModule = async () => {
    process.env.STORAGE_ENCRYPTION_KEY = 'khoa-test'

    const moduleRef = await Test.createTestingModule({ imports: [FakeDataSourceModule, StorageModule] })
      .overrideProvider(getRepositoryToken(StorageProviderEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageFolderEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageFileEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageSettingEntity))
      .useValue(makeRepositoryMock())
      .compile()

    return moduleRef
  }

  it('khởi tạo được module với đầy đủ service và controller', async () => {
    const moduleRef = await buildModule()

    const providers = [
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
    ]
    for (const provider of providers) {
      expect(moduleRef.get(provider)).toBeInstanceOf(provider)
    }

    const controllers = [StorageProviderController, StorageFileController, StorageFolderController, StorageOverviewController]
    for (const controller of controllers) {
      expect(moduleRef.get(controller)).toBeInstanceOf(controller)
    }

    await moduleRef.close()
  })

  it('export đúng những service mà module khác cần dùng', async () => {
    const moduleRef = await buildModule()

    // CloudinaryService import StorageService; thiếu export là app không khởi động được
    expect(moduleRef.get(StorageService)).toBeDefined()
    expect(moduleRef.get(StorageProviderService)).toBeDefined()
    expect(moduleRef.get(StorageFileService)).toBeDefined()
    expect(moduleRef.get(StorageUsageService)).toBeDefined()

    await moduleRef.close()
  })

  it('chạy được hook khởi động mà không cần DB thật', async () => {
    const moduleRef = await buildModule()
    const app = moduleRef.createNestApplication()

    jest.spyOn(moduleRef.get(StorageProviderSeeder)['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(moduleRef.get(StorageReferenceService)['logger'], 'log').mockImplementation(() => undefined)

    // init() kích hoạt onModuleInit của StorageReferenceService và
    // onApplicationBootstrap của StorageProviderSeeder
    await expect(app.init()).resolves.toBeDefined()

    // Dò cột xong thì phải có danh sách để tra ngược
    expect(moduleRef.get(StorageReferenceService).getScannedColumns().length).toBeGreaterThan(0)

    await app.close()
  })

  it('driver factory lấy được StorageCryptoService đã được inject', async () => {
    const moduleRef = await buildModule()
    const factory = moduleRef.get(StorageDriverFactory)

    // Dựng driver từ provider đã mã hoá: chứng minh crypto và factory nối đúng nhau
    const crypto = moduleRef.get(StorageCryptoService)
    const provider = Object.assign(new StorageProviderEntity(), {
      driver: 's3',
      preset: 'cloudflare_r2',
      public_base_url: 'https://pub.test',
      config_encrypted: crypto.encryptJson({
        preset: 'cloudflare_r2',
        bucket: 'hvm',
        account_id: 'acc',
        access_key_id: 'key',
        secret_access_key: 'secret',
      }),
    })

    expect(factory.create(provider).getPublicUrl('a.png')).toBe('https://pub.test/a.png')

    await moduleRef.close()
  })
})
