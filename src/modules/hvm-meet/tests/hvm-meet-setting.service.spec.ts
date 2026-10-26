import { HvmMeetStatus } from '@enums/meeting.enum'
import { StorageCryptoService } from '@modules/storage/services/storage-crypto.service'
import { SECRET_MASK } from '@modules/storage/storage.constants'
import { HvmMeetSettingEntity } from '../entities/hvm-meet-setting.entity'
import { HvmMeetWebhookController } from '../controllers/hvm-meet-webhook.controller'
import { signHvmMeetPayload } from '../hvm-meet.signature'
import { HvmMeetApiError, HvmMeetClientService } from '../services/hvm-meet-client.service'
import { HvmMeetSettingSeeder } from '../services/hvm-meet-setting.seeder'
import { HvmMeetSettingService } from '../services/hvm-meet-setting.service'

describe('Cấu hình HVM Meet', () => {
  let crypto: StorageCryptoService
  let client: HvmMeetClientService
  let settingRepository: any
  let row: HvmMeetSettingEntity | null
  let service: HvmMeetSettingService
  const env = { ...process.env }

  beforeEach(() => {
    process.env.STORAGE_ENCRYPTION_KEY = 'khoa-test'
    crypto = new StorageCryptoService()
    client = new HvmMeetClientService()
    row = null

    settingRepository = {
      findOne: jest.fn(async () => row),
      count: jest.fn(async () => (row ? 1 : 0)),
      create: jest.fn(data => Object.assign(new HvmMeetSettingEntity(), data)),
      save: jest.fn(async entity => (row = entity)),
    }
    service = new HvmMeetSettingService(settingRepository, crypto, client)
  })

  afterEach(() => {
    process.env = { ...env }
  })

  const seedRow = (config: Record<string, any>, overrides: Partial<HvmMeetSettingEntity> = {}) => {
    row = Object.assign(new HvmMeetSettingEntity(), {
      id: 1,
      config_encrypted: crypto.encryptJson(config),
      is_enabled: true,
      default_template_key: 'class',
      status: HvmMeetStatus.UNKNOWN,
      ...overrides,
    })
  }

  describe('seeder: env chỉ khởi tạo lần đầu', () => {
    it('bảng trống → tạo từ env, mã hoá, bật nếu đủ URL + key', async () => {
      process.env.HVM_MEET_URL = 'https://meet.test/'
      process.env.HVM_MEET_API_KEY = 'hvmm_academy_abcd'
      process.env.HVM_MEET_WEBHOOK_SECRET = 'whsec_1'

      await expect(new HvmMeetSettingSeeder(settingRepository, crypto).seed()).resolves.toBe(true)

      expect(row.is_enabled).toBe(true)
      expect(crypto.isEncrypted(row.config_encrypted)).toBe(true)
      expect(crypto.decryptJson(row.config_encrypted)).toEqual({
        base_url: 'https://meet.test',
        api_key: 'hvmm_academy_abcd',
        webhook_secret: 'whsec_1',
      })
    })

    it('thiếu env → tạo dòng đang tắt', async () => {
      delete process.env.HVM_MEET_URL
      delete process.env.HVM_MEET_API_KEY
      await new HvmMeetSettingSeeder(settingRepository, crypto).seed()
      expect(row.is_enabled).toBe(false)
    })

    it('đã có cấu hình (sửa trên trang quản trị) → không ghi đè dù env khác', async () => {
      seedRow({ base_url: 'https://meet.moi', api_key: 'key_moi' })
      process.env.HVM_MEET_URL = 'https://meet.cu'
      process.env.HVM_MEET_API_KEY = 'key_cu'

      await expect(new HvmMeetSettingSeeder(settingRepository, crypto).seed()).resolves.toBe(false)
      expect(settingRepository.save).not.toHaveBeenCalled()
      expect(crypto.decryptJson(row.config_encrypted).api_key).toBe('key_moi')
    })
  })

  describe('đọc / ghi', () => {
    it('trả ra API thì che secret, chỉ giữ 4 ký tự cuối', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'hvmm_academy_abcd1234', webhook_secret: 'whsec_9876' })
      const response = await service.getConfigResponse()

      expect(response).toMatchObject({
        base_url: 'https://meet.test',
        api_key: `${SECRET_MASK}1234`,
        webhook_secret: `${SECRET_MASK}9876`,
        has_api_key: true,
        has_webhook_secret: true,
        webhook_path: '/webhooks/hvm-meet',
      })
      expect(JSON.stringify(response)).not.toContain('hvmm_academy_abcd1234')
    })

    it('gửi lại secret đang che = giữ nguyên; chuỗi rỗng = xoá; không gọi test khi kết nối không đổi', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'hvmm_academy_abcd1234', webhook_secret: 'whsec_9876' })
      const me = jest.spyOn(client, 'me')

      await service.updateConfig({ api_key: `${SECRET_MASK}1234`, webhook_secret: '', default_template_key: 'lecture', is_enabled: false })

      expect(crypto.decryptJson(row.config_encrypted)).toEqual({
        base_url: 'https://meet.test',
        api_key: 'hvmm_academy_abcd1234',
        webhook_secret: null,
      })
      expect(row).toMatchObject({ default_template_key: 'lecture', is_enabled: false })
      expect(me).not.toHaveBeenCalled()
    })

    it('URL không phải http(s) thì từ chối', async () => {
      seedRow({})
      await expect(service.updateConfig({ base_url: 'ftp://meet.test' })).rejects.toMatchObject({ response: { data: { field: 'base_url' } } })
    })

    it('getActiveConfig null khi tắt hoặc thiếu key; secret webhook vẫn đọc được khi tắt', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'k', webhook_secret: 'whsec' }, { is_enabled: false })
      await expect(service.getActiveConfig()).resolves.toBeNull()
      await expect(service.getWebhookSecret()).resolves.toBe('whsec')

      seedRow({ base_url: 'https://meet.test' })
      await expect(service.getActiveConfig()).resolves.toBeNull()
    })
  })

  describe('kiểm tra kết nối', () => {
    it('thành công: trả tên app + allowedOrigins và ghi trạng thái healthy', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'k' })
      jest.spyOn(client, 'me').mockResolvedValue({ id: 'a1', slug: 'academy', name: 'Học viện', allowedOrigins: ['https://hvmv.edu.vn'] })

      const result = await service.testConfig({})

      expect(result).toMatchObject({ ok: true, details: { app: { slug: 'academy' }, allowedOrigins: ['https://hvmv.edu.vn'] } })
      expect(row.status).toBe(HvmMeetStatus.HEALTHY)
    })

    it('key bị từ chối: báo lỗi dễ hiểu, ghi trạng thái error', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'k' })
      jest.spyOn(client, 'me').mockRejectedValue(new HvmMeetApiError('401', 401, 'UNAUTHORIZED'))

      const result = await service.testConfig({})

      expect(result.ok).toBe(false)
      expect(result.message).toContain('API key bị HVM Meet từ chối')
      expect(row.status).toBe(HvmMeetStatus.ERROR)
    })

    it('kiểm tra giá trị chưa lưu thì không ghi trạng thái của cấu hình đã lưu', async () => {
      seedRow({ base_url: 'https://meet.test', api_key: 'k' })
      jest.spyOn(client, 'me').mockResolvedValue({ id: 'a1', slug: 'academy', name: 'x', allowedOrigins: [] })

      await service.testConfig({ base_url: 'https://meet-khac.test' })

      expect(client.me).toHaveBeenCalledWith({ baseUrl: 'https://meet-khac.test', apiKey: 'k' })
      expect(row.status).toBe(HvmMeetStatus.UNKNOWN)
    })
  })
})

describe('HvmMeetWebhookController', () => {
  const secret = 'whsec_test'
  const body = Buffer.from(JSON.stringify({ id: 'd1', event: 'ping', createdAt: '', app: 'academy', data: {} }))
  let controller: HvmMeetWebhookController
  let webhookService: any

  beforeEach(() => {
    webhookService = { handle: jest.fn(async envelope => ({ event: envelope.event, handled: false, skipped: 'event_ignored' })) }
    controller = new HvmMeetWebhookController({ getWebhookSecret: jest.fn(async () => secret) } as any, webhookService)
    jest.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined)
    jest.spyOn(controller['logger'], 'error').mockImplementation(() => undefined)
  })

  it('chữ ký đúng trên raw body → xử lý và trả 2xx', async () => {
    const result = await controller.receive({ body }, signHvmMeetPayload(secret, body), 'ping', 'd1')
    expect(result).toMatchObject({ received: true, event: 'ping' })
    expect(webhookService.handle).toHaveBeenCalledTimes(1)
  })

  it('chữ ký sai → 401, không xử lý', async () => {
    const error = await controller.receive({ body }, signHvmMeetPayload('sai', body), 'ping', 'd1').catch(err => err)
    expect(error.getStatus()).toBe(401)
    expect(webhookService.handle).not.toHaveBeenCalled()
  })

  it('body đã bị parse thành object (mất raw body) → từ chối', async () => {
    const error = await controller.receive({ body: JSON.parse(body.toString()) }, signHvmMeetPayload(secret, body), 'ping', 'd1').catch(err => err)
    expect(error.getStatus()).toBe(400)
    expect(webhookService.handle).not.toHaveBeenCalled()
  })
})
