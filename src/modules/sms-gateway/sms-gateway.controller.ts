import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateSmsJobDto } from './dtos/create-sms-job.dto'
import { PaginateSmsDeviceDto } from './dtos/paginate-sms-device.dto'
import { PaginateSmsJobDto } from './dtos/paginate-sms-job.dto'
import { RegisterSmsDeviceDto } from './dtos/register-sms-device.dto'
import { UpdateSmsDeviceDto } from './dtos/update-sms-device.dto'
import { SmsGatewayService } from './sms-gateway.service'
import { SmsGatewayWs } from './sms-gateway.ws'

@ApiTags('SMS Gateway')
@ApiBearerAuth()
@Controller('sms-gateway')
export class SmsGatewayController {
  constructor(private readonly smsGatewayService: SmsGatewayService) {}

  @Post('jobs')
  @Auth()
  @ApiOperation({ summary: 'Tạo yêu cầu gửi SMS mới vào hàng đợi (Website / Hệ thống)' })
  async createSmsJob(@Body() dto: CreateSmsJobDto, @Req() req: any): Promise<ResponseDto> {
    const userId = req?.user?.userId ?? null
    const job = await this.smsGatewayService.enqueueSms(dto, userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'SMS_JOB_QUEUED',
      data: job,
    })
  }

  @Get('jobs/:idOrUid')
  @Auth()
  @ApiOperation({ summary: 'Tra cứu trạng thái của một yêu cầu gửi SMS theo ID hoặc job_uid' })
  @ApiParam({ name: 'idOrUid', type: String })
  async getSmsJobStatus(@Param('idOrUid') idOrUid: string): Promise<ResponseDto> {
    const job = await this.smsGatewayService.getJobByIdOrUid(idOrUid)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_JOB_FETCHED',
      data: job,
    })
  }
}

@ApiTags('Admin SMS Gateway')
@ApiBearerAuth()
@Controller('admin/sms-gateway')
export class AdminSmsGatewayController {
  constructor(
    private readonly smsGatewayService: SmsGatewayService,
    private readonly smsGatewayWs: SmsGatewayWs,
  ) {}

  @Post('devices')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Đăng ký thiết bị Android SMS Gateway mới (trả về deviceSecret 1 lần)' })
  async registerDevice(@Body() dto: RegisterSmsDeviceDto): Promise<ResponseDto> {
    const result = await this.smsGatewayService.registerDevice(dto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'SMS_DEVICE_REGISTERED',
      data: result,
    })
  }

  @Get('devices')
  @Auth(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Danh sách thiết bị SMS Gateway và trạng thái ONLINE / OFFLINE' })
  async getDevices(@Query() paginateDto: PaginateSmsDeviceDto): Promise<ResponseDto> {
    const result = await this.smsGatewayService.getDevices(paginateDto)
    const connectedSet = new Set(this.smsGatewayWs.getConnectedDeviceIds())
    const data = await Promise.all(
      result.data.map(async device => {
        const usage = await this.smsGatewayService.getDeviceUsageStats(device.device_id)
        return {
          ...device,
          is_socket_connected: connectedSet.has(device.device_id),
          usage,
        }
      }),
    )
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_DEVICES_FETCHED',
      data,
      meta: result.meta,
    })
  }

  @Get('devices/:id')
  @Auth(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Chi tiết thiết bị SMS Gateway và thống kê lưu lượng gửi' })
  @ApiParam({ name: 'id', type: Number })
  async getDeviceById(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    const device = await this.smsGatewayService.getDeviceById(id)
    const usage = await this.smsGatewayService.getDeviceUsageStats(device.device_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_DEVICE_FETCHED',
      data: {
        ...device,
        is_socket_connected: this.smsGatewayWs.isDeviceOnline(device.device_id),
        usage,
      },
    })
  }

  @Put('devices/:id')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình, hạn mức hoặc vô hiệu hóa thiết bị SMS Gateway' })
  @ApiParam({ name: 'id', type: Number })
  async updateDevice(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSmsDeviceDto): Promise<ResponseDto> {
    const updated = await this.smsGatewayService.updateDevice(id, dto)
    if (dto.is_active === false) {
      this.smsGatewayWs.disconnectDevice(updated.device_id, 4003, 'DEVICE_DISABLED')
    } else {
      this.smsGatewayService.notifyDispatchReady()
    }
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_DEVICE_UPDATED',
      data: updated,
    })
  }

  @Post('devices/:id/rotate-secret')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Cấp lại khóa bí mật (deviceSecret) cho thiết bị và ngắt kết nối phiên cũ' })
  @ApiParam({ name: 'id', type: Number })
  async rotateDeviceSecret(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    const result = await this.smsGatewayService.rotateDeviceSecret(id)
    this.smsGatewayWs.disconnectDevice(result.device.device_id, 4001, 'SECRET_ROTATED')
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_DEVICE_SECRET_ROTATED',
      data: result,
    })
  }

  @Post('jobs')
  @Auth(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Admin tạo yêu cầu gửi SMS vào hàng đợi' })
  async createAdminSmsJob(@Body() dto: CreateSmsJobDto, @Req() req: any): Promise<ResponseDto> {
    const userId = req?.user?.userId ?? null
    const job = await this.smsGatewayService.enqueueSms(dto, userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'SMS_JOB_QUEUED',
      data: job,
    })
  }

  @Get('jobs')
  @Auth(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Danh sách lịch sử SMS Jobs (có phân trang, bộ lọc và thống kê trạng thái)' })
  async getJobs(@Query() paginateDto: PaginateSmsJobDto): Promise<ResponseDto> {
    const [result, summary] = await Promise.all([this.smsGatewayService.getJobs(paginateDto), this.smsGatewayService.getQueueStatsSummary()])
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_JOBS_FETCHED',
      data: result.data,
      meta: {
        ...result.meta,
        summary,
      },
    })
  }

  @Get('jobs/:idOrUid')
  @Auth(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Chi tiết một SMS Job theo ID hoặc job_uid' })
  @ApiParam({ name: 'idOrUid', type: String })
  async getJobByIdOrUid(@Param('idOrUid') idOrUid: string): Promise<ResponseDto> {
    const job = await this.smsGatewayService.getJobByIdOrUid(idOrUid)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SMS_JOB_FETCHED',
      data: job,
    })
  }
}
