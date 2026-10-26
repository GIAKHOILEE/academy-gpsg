import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Get, HttpStatus, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { TestHvmMeetSettingDto, UpdateHvmMeetSettingDto } from '../dtos/hvm-meet-setting.dto'
import { HvmMeetSettingService } from '../services/hvm-meet-setting.service'

@ApiTags('Admin HVM Meet')
@ApiBearerAuth()
@Auth(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/hvm-meet')
export class HvmMeetSettingController {
  constructor(private readonly settingService: HvmMeetSettingService) {}

  @Get('config')
  @ApiOperation({ summary: 'Lấy cấu hình tích hợp HVM Meet (secret được che)' })
  async getConfig(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HVM_MEET_CONFIG_FETCHED_SUCCESSFULLY',
      data: await this.settingService.getConfigResponse(),
    })
  }

  @Put('config')
  @ApiOperation({
    summary: 'Cập nhật cấu hình tích hợp HVM Meet',
    description: 'Secret gửi lại ở dạng che (••••) nghĩa là giữ nguyên. Có hiệu lực ngay, không cần sửa env hay restart.',
  })
  async updateConfig(@Body() dto: UpdateHvmMeetSettingDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HVM_MEET_CONFIG_UPDATED_SUCCESSFULLY',
      data: await this.settingService.updateConfig(dto),
    })
  }

  @Post('config/test')
  @ApiOperation({
    summary: 'Kiểm tra kết nối HVM Meet (GET /v1/integration/me)',
    description: 'Truyền giá trị đang nhập trên form để kiểm tra trước khi lưu; trường bỏ trống hoặc còn che thì dùng giá trị đã lưu.',
  })
  async testConfig(@Body() dto: TestHvmMeetSettingDto): Promise<ResponseDto> {
    const result = await this.settingService.testConfig(dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: result.ok ? 'HVM_MEET_TEST_SUCCESS' : 'HVM_MEET_TEST_FAILED',
      data: result,
    })
  }
}
