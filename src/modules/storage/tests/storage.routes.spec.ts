import { JwtAuthGuard } from '@/guards/jwt-auth.guard'
import { RolesGuard } from '@/guards/roles.guard'
import { CanActivate, ExecutionContext, Global, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'
import { StorageFileService } from '../services/storage-file.service'
import { StorageFolderService } from '../services/storage-folder.service'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageReferenceService } from '../services/storage-reference.service'
import { StorageUsageService } from '../services/storage-usage.service'
import { StorageModule } from '../storage.module'

/**
 * Gọi HTTP thật qua supertest.
 *
 * Mục đích chính: chứng minh các route tĩnh không bị route động ăn mất. Nest
 * khớp route theo thứ tự khai báo, nên `GET /providers/schemas` phải nằm trước
 * `GET /providers/:id`, và `DELETE /files/bulk` phải nằm trước `DELETE /files/:id`.
 * Đặt sai thứ tự thì "schemas" sẽ bị hiểu là id, và đó là loại lỗi mà unit test
 * gọi thẳng vào service không bao giờ phát hiện được.
 */
describe('Storage routes (HTTP)', () => {
  /** Guard giả: luôn cho qua, để test tập trung vào routing. */
  class AllowAllGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      // Controller đọc req.user.userId khi upload, nên phải gắn user giả
      context.switchToHttp().getRequest().user = { userId: 1, role: 1 }
      return true
    }
  }

  const dataSourceMock = { entityMetadatas: [], query: jest.fn(async () => []) }

  @Global()
  @Module({
    providers: [{ provide: getDataSourceToken(), useValue: dataSourceMock as unknown as DataSource }],
    exports: [getDataSourceToken()],
  })
  class FakeDataSourceModule {}

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

  let app: Awaited<ReturnType<typeof createApp>>
  let providerService: StorageProviderService
  let fileService: StorageFileService
  let folderService: StorageFolderService
  let usageService: StorageUsageService

  const createApp = async () => {
    process.env.STORAGE_ENCRYPTION_KEY = 'khoa-test'

    const moduleRef = await Test.createTestingModule({
      imports: [FakeDataSourceModule, StorageModule],
    })
      .overrideProvider(getRepositoryToken(StorageProviderEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageFolderEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageFileEntity))
      .useValue(makeRepositoryMock())
      .overrideProvider(getRepositoryToken(StorageSettingEntity))
      .useValue(makeRepositoryMock())
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAllGuard)
      .compile()

    providerService = moduleRef.get(StorageProviderService)
    fileService = moduleRef.get(StorageFileService)
    folderService = moduleRef.get(StorageFolderService)
    usageService = moduleRef.get(StorageUsageService)

    jest.spyOn(moduleRef.get(StorageReferenceService)['logger'], 'log').mockImplementation(() => undefined)

    const nestApp = moduleRef.createNestApplication()
    await nestApp.init()
    return nestApp
  }

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('route tĩnh không bị route động ăn mất', () => {
    it('GET /admin/storage/providers/schemas trả schema, không bị hiểu là id', async () => {
      const spy = jest.spyOn(providerService, 'getProviderById')

      const response = await request(app.getHttpServer()).get('/admin/storage/providers/schemas').expect(200)

      expect(response.body.data.drivers.length).toBeGreaterThan(0)
      expect(response.body.data.s3_presets.length).toBeGreaterThan(15)
      expect(response.body.data.strategies).toHaveLength(4)
      // Nếu route bị :id ăn mất thì handler chi tiết mới là cái được gọi
      expect(spy).not.toHaveBeenCalled()
    })

    it('GET /admin/storage/providers/settings trả cấu hình chung', async () => {
      const spy = jest.spyOn(providerService, 'getProviderById')

      await request(app.getHttpServer()).get('/admin/storage/providers/settings').expect(200)

      expect(spy).not.toHaveBeenCalled()
    })

    it('GET /admin/storage/providers/select trả danh sách gọn', async () => {
      const spy = jest.spyOn(providerService, 'getProviderById')

      const response = await request(app.getHttpServer()).get('/admin/storage/providers/select').expect(200)

      expect(Array.isArray(response.body.data)).toBe(true)
      expect(spy).not.toHaveBeenCalled()
    })

    it('DELETE /admin/storage/files/bulk xoá theo lô, không bị hiểu là id', async () => {
      const bulkSpy = jest.spyOn(fileService, 'bulkDelete').mockResolvedValue({
        deleted: [1, 2],
        skipped: [],
        deleted_count: 2,
        skipped_count: 0,
      })
      const singleSpy = jest.spyOn(fileService, 'deleteFile')

      await request(app.getHttpServer())
        .delete('/admin/storage/files/bulk')
        .send({ ids: [1, 2] })
        .expect(200)

      expect(bulkSpy).toHaveBeenCalledWith(expect.objectContaining({ ids: [1, 2] }))
      expect(singleSpy).not.toHaveBeenCalled()
    })

    it('POST /admin/storage/providers/refresh-usage làm mới tất cả, không bị hiểu là id', async () => {
      const allSpy = jest.spyOn(usageService, 'refreshAllUsage').mockResolvedValue([])
      const oneSpy = jest.spyOn(usageService, 'refreshProviderUsage')

      await request(app.getHttpServer()).post('/admin/storage/providers/refresh-usage').expect(201)

      expect(allSpy).toHaveBeenCalled()
      expect(oneSpy).not.toHaveBeenCalled()
    })
  })

  describe('route động nhận đúng tham số', () => {
    it('GET /admin/storage/providers/:id ép id về số', async () => {
      const spy = jest.spyOn(providerService, 'getProviderById').mockResolvedValue({ id: 7 } as never)

      await request(app.getHttpServer()).get('/admin/storage/providers/7').expect(200)

      expect(spy).toHaveBeenCalledWith(7)
    })

    it('GET /admin/storage/providers/:id trả 400 với id không phải số', async () => {
      // ParseIntPipe chặn ngay, không để chuỗi lạ chui vào tầng service
      await request(app.getHttpServer()).get('/admin/storage/providers/khong-phai-so').expect(400)
    })

    it('POST /admin/storage/files/scan/:providerId nhận đúng providerId', async () => {
      const spy = jest.spyOn(fileService, 'scanProvider').mockResolvedValue({
        provider_id: 3,
        provider_name: 'R2',
        scanned: 0,
        imported: 0,
        updated: 0,
        truncated: false,
      })

      await request(app.getHttpServer()).post('/admin/storage/files/scan/3').send({ recursive: true }).expect(201)

      expect(spy).toHaveBeenCalledWith(3, expect.objectContaining({ recursive: true }))
    })

    it('GET /admin/storage/folders/tree/:providerId nhận đúng providerId', async () => {
      const spy = jest.spyOn(folderService, 'getFolderTree').mockResolvedValue({
        provider_id: 5,
        root: { file_count: 0, size_bytes: 0 },
        folders: [],
      })

      await request(app.getHttpServer()).get('/admin/storage/folders/tree/5').expect(200)

      expect(spy).toHaveBeenCalledWith(5)
    })

    it('DELETE /admin/storage/files/:id?force=true truyền cờ force xuống service', async () => {
      const spy = jest.spyOn(fileService, 'deleteFile').mockResolvedValue({ id: 9, deleted: true })

      await request(app.getHttpServer()).delete('/admin/storage/files/9?force=true').expect(200)

      expect(spy).toHaveBeenCalledWith(9, true)
    })

    it('DELETE /admin/storage/files/:id không có force thì mặc định là false', async () => {
      const spy = jest.spyOn(fileService, 'deleteFile').mockResolvedValue({ id: 9, deleted: true })

      await request(app.getHttpServer()).delete('/admin/storage/files/9').expect(200)

      expect(spy).toHaveBeenCalledWith(9, false)
    })

    it('GET /admin/storage/files/:id/signed-url kẹp thời hạn vào khoảng hợp lệ', async () => {
      const spy = jest.spyOn(fileService, 'getSignedUrl').mockResolvedValue({ url: 'https://x', signed: true, expires_in: 60 })

      // Quá nhỏ bị nâng lên tối thiểu 60 giây
      await request(app.getHttpServer()).get('/admin/storage/files/1/signed-url?expires_in=1').expect(200)
      expect(spy).toHaveBeenLastCalledWith(1, 60)

      // Quá lớn bị hạ xuống tối đa 7 ngày
      await request(app.getHttpServer()).get('/admin/storage/files/1/signed-url?expires_in=99999999').expect(200)
      expect(spy).toHaveBeenLastCalledWith(1, 7 * 24 * 3600)

      // Không truyền thì mặc định 1 tiếng
      await request(app.getHttpServer()).get('/admin/storage/files/1/signed-url').expect(200)
      expect(spy).toHaveBeenLastCalledWith(1, 3600)
    })
  })

  describe('các route còn lại đều có mặt', () => {
    it('GET /admin/storage/overview trả tổng quan', async () => {
      const response = await request(app.getHttpServer()).get('/admin/storage/overview').expect(200)

      expect(response.body.data.summary).toBeDefined()
      expect(response.body.data.providers).toEqual([])
    })

    it('GET /admin/storage/scanned-columns trả danh sách cột được tra ngược', async () => {
      const response = await request(app.getHttpServer()).get('/admin/storage/scanned-columns').expect(200)

      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('columns')
    })

    it('GET /admin/storage/files phân trang được', async () => {
      const response = await request(app.getHttpServer()).get('/admin/storage/files?page=1&limit=10').expect(200)

      expect(response.body.data).toEqual([])
      expect(response.body.meta).toMatchObject({ page: 1, limit: 10 })
    })

    it('POST /admin/storage/providers/test kiểm tra cấu hình mà không cần lưu', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/storage/providers/test')
        .send({ driver: 's3', config: { preset: 'aws_s3' } })
        .expect(201)

      // Thiếu field bắt buộc nên phải trả ok = false kèm lý do, không phải 500
      expect(response.body.data.ok).toBe(false)
      expect(response.body.data.message).toContain('Bucket')
    })

    it('POST /admin/storage/files/upload báo lỗi rõ khi không gửi file', async () => {
      const response = await request(app.getHttpServer()).post('/admin/storage/files/upload').expect(400)

      expect(response.body.message).toContain('Chưa chọn file')
    })

    it('POST /admin/storage/folders tạo thư mục', async () => {
      const spy = jest.spyOn(folderService, 'createFolder').mockResolvedValue({ id: 1, name: 'anh', path: 'anh' } as never)

      await request(app.getHttpServer()).post('/admin/storage/folders').send({ provider_id: 1, name: 'anh' }).expect(201)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ provider_id: 1, name: 'anh' }))
    })

    it('PATCH /admin/storage/folders/:id/rename đổi tên thư mục', async () => {
      const spy = jest.spyOn(folderService, 'renameFolder').mockResolvedValue({ id: 1, name: 'moi' } as never)

      await request(app.getHttpServer()).patch('/admin/storage/folders/1/rename').send({ name: 'moi' }).expect(200)

      expect(spy).toHaveBeenCalledWith(1, { name: 'moi' })
    })

    it('PATCH /admin/storage/providers/:id/toggle bật tắt nhận upload', async () => {
      const spy = jest.spyOn(providerService, 'toggleEnabled').mockResolvedValue({ id: 1 } as never)

      await request(app.getHttpServer()).patch('/admin/storage/providers/1/toggle').send({ is_enabled: false }).expect(200)

      expect(spy).toHaveBeenCalledWith(1, false)
    })

    it('PATCH /admin/storage/providers/:id/default đặt dịch vụ mặc định', async () => {
      const spy = jest.spyOn(providerService, 'setDefault').mockResolvedValue({ id: 2 } as never)

      await request(app.getHttpServer()).patch('/admin/storage/providers/2/default').expect(200)

      expect(spy).toHaveBeenCalledWith(2)
    })

    it('PUT /admin/storage/providers/settings cập nhật cấu hình chung', async () => {
      const spy = jest.spyOn(providerService, 'updateSettings').mockResolvedValue({ id: 1, strategy: 'priority_fill' } as never)

      await request(app.getHttpServer()).put('/admin/storage/providers/settings').send({ strategy: 'priority_fill' }).expect(200)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ strategy: 'priority_fill' }))
    })
  })
})
