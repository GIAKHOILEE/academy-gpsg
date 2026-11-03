import { HvmMeetWebhookController } from '../controllers/hvm-meet-webhook.controller'
import { signHvmMeetPayload } from '../hvm-meet.signature'

/**
 * Endpoint kiểm mã cho link công khai của HVM Meet (POST webhooks/hvm-meet/verify-code).
 * Có test ở tầng controller vì đã từng có service mà QUÊN gắn route — test service vẫn xanh.
 */
describe('HvmMeetWebhookController.verifyCode', () => {
  const secret = 'whsec_verify'
  const settingService = { getWebhookSecret: jest.fn(async () => secret) }
  const meetingService = { verifyJoinCode: jest.fn(async () => ({ ok: true, identity: 'academy:user:101' })) }
  const controller = new HvmMeetWebhookController(settingService as any, {} as any, meetingService as any)
  jest.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined)

  const body = Buffer.from(JSON.stringify({ roomExternalId: 'lesson-12', code: '2026-0001', factor: 'birthdate', birthDate: '2001-09-23' }))

  it('chữ ký đúng → chuyển mã + ngày sinh cho service, trả kết quả', async () => {
    const res = await controller.verifyCode({ body }, signHvmMeetPayload(secret, body))
    expect(res).toEqual({ ok: true, identity: 'academy:user:101' })
    expect(meetingService.verifyJoinCode).toHaveBeenCalledWith('lesson-12', '2026-0001', { kind: 'birthdate', birthDate: '2001-09-23' })
  })

  it('sai chữ ký → 401, không tra mã', async () => {
    meetingService.verifyJoinCode.mockClear()
    await expect(controller.verifyCode({ body }, signHvmMeetPayload('secret-khac', body))).rejects.toMatchObject({ status: 401 })
    expect(meetingService.verifyJoinCode).not.toHaveBeenCalled()
  })

  it('body đã bị parse thành JSON (mất raw body) → 401', async () => {
    await expect(controller.verifyCode({ body: { code: 'x' } }, signHvmMeetPayload(secret, body))).rejects.toMatchObject({ status: 401 })
  })
})
