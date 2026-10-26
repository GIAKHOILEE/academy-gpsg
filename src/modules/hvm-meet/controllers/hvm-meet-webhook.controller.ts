import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { HvmMeetWebhookEnvelope } from '../hvm-meet.types'
import { verifyHvmMeetSignature } from '../hvm-meet.signature'
import { HvmMeetSettingService } from '../services/hvm-meet-setting.service'
import { HvmMeetWebhookService } from '../services/hvm-meet-webhook.service'

/**
 * Nhận webhook từ HVM Meet. Không đăng nhập, xác thực bằng chữ ký HMAC trên raw body
 * (main.ts gắn express.raw riêng cho đường này nên `req.body` là Buffer).
 */
@ApiExcludeController()
@Controller('webhooks/hvm-meet')
export class HvmMeetWebhookController {
  private readonly logger = new Logger(HvmMeetWebhookController.name)

  constructor(
    private readonly settingService: HvmMeetSettingService,
    private readonly webhookService: HvmMeetWebhookService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() req,
    @Headers('x-hvm-signature') signature: string,
    @Headers('x-hvm-event') eventHeader: string,
    @Headers('x-hvm-delivery') delivery: string,
  ) {
    const rawBody: Buffer | null = Buffer.isBuffer(req.body) ? req.body : null
    if (!rawBody) {
      // Body đã bị parse thành JSON ở đâu đó trước: không còn byte gốc để kiểm chữ ký
      this.logger.error('Webhook HVM Meet không có raw body, kiểm tra cấu hình express.raw trong main.ts')
      throwAppException('HVM_MEET_WEBHOOK_INVALID_SIGNATURE', ErrorCode.HVM_MEET_WEBHOOK_INVALID_SIGNATURE, HttpStatus.BAD_REQUEST)
    }

    const secret = await this.settingService.getWebhookSecret()
    const verification = verifyHvmMeetSignature(signature, rawBody, secret)
    if (verification.ok === false) {
      this.logger.warn(`Từ chối webhook HVM Meet ${delivery || ''} (${eventHeader || '?'}): chữ ký không hợp lệ (${verification.reason})`)
      throwAppException('HVM_MEET_WEBHOOK_INVALID_SIGNATURE', ErrorCode.HVM_MEET_WEBHOOK_INVALID_SIGNATURE, HttpStatus.UNAUTHORIZED, {
        reason: verification.reason,
      })
    }

    let envelope: HvmMeetWebhookEnvelope
    try {
      envelope = JSON.parse(rawBody.toString('utf8'))
    } catch {
      // Chữ ký đúng mà body hỏng thì gửi lại cũng vậy: trả 2xx để HVM Meet khỏi thử lại
      this.logger.warn(`Webhook HVM Meet ${delivery || ''} có body không phải JSON, bỏ qua`)
      return { received: true, handled: false, skipped: 'invalid_json' }
    }

    const result = await this.webhookService.handle({ ...envelope, event: envelope?.event || eventHeader })
    return { received: true, ...result }
  }
}
