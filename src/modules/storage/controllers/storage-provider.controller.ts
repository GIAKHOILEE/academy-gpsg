import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  CreateStorageProviderDto,
  PaginateStorageProviderDto,
  TestStorageProviderDto,
  ToggleStorageProviderDto,
  UpdateStorageProviderDto,
  UpdateStorageSettingDto,
} from '../dtos/storage-provider.dto'
import { StorageProviderService } from '../services/storage-provider.service'
import { StorageUsageService } from '../services/storage-usage.service'

@ApiTags('Admin Storage Providers')
@ApiBearerAuth()
@Auth(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/storage/providers')
export class StorageProviderController {
  constructor(
    private readonly providerService: StorageProviderService,
    private readonly usageService: StorageUsageService,
  ) {}

  @Get('schemas')
  @ApiOperation({
    summary: 'Lấy schema form của mọi loại dịch vụ lưu trữ',
    description: 'FE dựng form thêm/sửa dịch vụ từ dữ liệu này, nên thêm dịch vụ mới ở backend là FE tự có.',
  })
  async getSchemas(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_SCHEMAS_FETCHED_SUCCESSFULLY',
      data: this.providerService.getDriverSchemas(),
    })
  }

  @Get('settings')
  @ApiOperation({ summary: 'Lấy cấu hình chung (chiến lược chia tải, chu kỳ làm mới dung lượng)' })
  async getSettings(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_SETTINGS_FETCHED_SUCCESSFULLY',
      data: await this.providerService.getSettings(),
    })
  }

  @Put('settings')
  @ApiOperation({ summary: 'Cập nhật cấu hình chung' })
  async updateSettings(@Body() dto: UpdateStorageSettingDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_SETTINGS_UPDATED_SUCCESSFULLY',
      data: await this.providerService.updateSettings(dto),
    })
  }

  @Get('select')
  @ApiOperation({ summary: 'Danh sách gọn để chọn nơi upload' })
  async listForSelect(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDERS_FETCHED_SUCCESSFULLY',
      data: await this.providerService.listProvidersForSelect(),
    })
  }

  @Post('test')
  @ApiOperation({
    summary: 'Kiểm tra cấu hình trước khi lưu',
    description: 'Truyền provider_id nếu form đang giữ secret dạng che, hệ thống sẽ lấy secret thật từ DB.',
  })
  async testConfig(@Body() dto: TestStorageProviderDto): Promise<ResponseDto> {
    const result = await this.providerService.testConfig(dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: result.ok ? 'STORAGE_PROVIDER_TEST_SUCCESS' : 'STORAGE_PROVIDER_TEST_FAILED',
      data: result,
    })
  }

  @Post('refresh-usage')
  @ApiOperation({ summary: 'Làm mới dung lượng của tất cả dịch vụ' })
  async refreshAllUsage(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_USAGE_REFRESHED_SUCCESSFULLY',
      data: await this.usageService.refreshAllUsage(),
    })
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách dịch vụ lưu trữ' })
  async getProviders(@Query() params: PaginateStorageProviderDto): Promise<ResponseDto> {
    const result = await this.providerService.paginateProviders(params)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDERS_FETCHED_SUCCESSFULLY',
      data: result.data,
      meta: result.meta,
    })
  }

  @Post()
  @ApiOperation({ summary: 'Thêm dịch vụ lưu trữ' })
  async createProvider(@Body() dto: CreateStorageProviderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'STORAGE_PROVIDER_CREATED_SUCCESSFULLY',
      data: await this.providerService.createProvider(dto),
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một dịch vụ (secret được che)' })
  async getProvider(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_FETCHED_SUCCESSFULLY',
      data: await this.providerService.getProviderById(id),
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật dịch vụ' })
  async updateProvider(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStorageProviderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_UPDATED_SUCCESSFULLY',
      data: await this.providerService.updateProvider(id, dto),
    })
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá cấu hình dịch vụ',
    description: 'Không xoá file trên dịch vụ. Bị chặn nếu còn file trong danh mục, vì xoá đi là mất dấu các file đó.',
  })
  async deleteProvider(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_DELETED_SUCCESSFULLY',
      data: await this.providerService.deleteProvider(id),
    })
  }

  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Bật / tắt nhận upload',
    description: 'Tắt chỉ ngăn upload file mới. File đã nằm trên dịch vụ vẫn đọc, xoá, di chuyển được bình thường.',
  })
  async toggleProvider(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleStorageProviderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_UPDATED_SUCCESSFULLY',
      data: await this.providerService.toggleEnabled(id, dto.is_enabled),
    })
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Đặt làm dịch vụ mặc định' })
  async setDefault(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_UPDATED_SUCCESSFULLY',
      data: await this.providerService.setDefault(id),
    })
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test lại một dịch vụ đã lưu và ghi trạng thái' })
  async testProvider(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    const result = await this.providerService.refreshStatus(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: result.ok ? 'STORAGE_PROVIDER_TEST_SUCCESS' : 'STORAGE_PROVIDER_TEST_FAILED',
      data: result,
    })
  }

  @Post(':id/refresh-usage')
  @ApiOperation({ summary: 'Làm mới dung lượng của một dịch vụ' })
  async refreshUsage(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_USAGE_REFRESHED_SUCCESSFULLY',
      data: await this.usageService.refreshProviderUsage(id),
    })
  }
}
