import { Body, Controller, Get, Put } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { UpdateSettingDto } from './dtos/update-setting.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@Controller('admin/settings')
@ApiTags('Admin Settings')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class SettingsControllerAdmin {
  constructor(private readonly settingsService: SettingsService) {}

  @Put()
  @ApiOperation({ summary: 'Cập nhật cài đặt' })
  async updateSettings(@Body() updateSettingsDto: UpdateSettingDto): Promise<ResponseDto> {
    const data = await this.settingsService.updateSettings(updateSettingsDto)
    return {
      statusCode: 200,
      messageCode: 'SETTINGS_UPDATE_SUCCESS',
      data,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy cài đặt' })
  async getSettings(): Promise<ResponseDto> {
    const data = await this.settingsService.getSettings()
    return {
      statusCode: 200,
      messageCode: 'SETTINGS_GET_SUCCESS',
      data,
    }
  }
}

@Controller('settings')
@ApiTags('User Settings')
@ApiBearerAuth()
@Auth()
export class UserSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy cài đặt' })
  async getSettings(): Promise<ResponseDto> {
    const data = await this.settingsService.getSettings()
    return {
      statusCode: 200,
      messageCode: 'SETTINGS_GET_SUCCESS',
      data,
    }
  }
}
