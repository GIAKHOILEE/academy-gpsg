import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { TimekeepingService } from './timekeeping.service'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { CreateTimekeepingDto } from './dtos/create-timekeeping.dto'
import { ResponseDto } from '@common/response.dto'
import { UpdateTimekeepingDto } from './dtos/update-timekeeping.dto'
import { PaginateTimekeepingDto } from './dtos/paginate-timekeeping.dto'

@Controller('admin/timekeepings')
@ApiTags('Admin Timekeeping')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminTimekeepingController {
  constructor(private readonly timekeepingService: TimekeepingService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo bảng chấm công' })
  async createTimekeeping(@Body() createTimekeepingDto: CreateTimekeepingDto): Promise<ResponseDto> {
    const timekeeping = await this.timekeepingService.createTimekeeping(createTimekeepingDto)
    return {
      statusCode: 201,
      messageCode: 'TIMEKEEPING_CREATE_SUCCESS',
      data: timekeeping,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bảng chấm công' })
  @ApiParam({ name: 'id', type: Number })
  async updateTimekeeping(@Param('id') id: number, @Body() updateTimekeepingDto: UpdateTimekeepingDto): Promise<ResponseDto> {
    const timekeeping = await this.timekeepingService.updateTimekeeping(id, updateTimekeepingDto)
    return {
      statusCode: 200,
      messageCode: 'TIMEKEEPING_UPDATE_SUCCESS',
      data: timekeeping,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bảng chấm công' })
  @ApiParam({ name: 'id', type: Number })
  async deleteTimekeeping(@Param('id') id: number): Promise<ResponseDto> {
    await this.timekeepingService.deleteTimekeeping(id)
    return {
      statusCode: 200,
      messageCode: 'TIMEKEEPING_DELETE_SUCCESS',
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy bảng chấm công theo id' })
  @ApiParam({ name: 'id', type: Number })
  async getTimekeepingById(@Param('id') id: number): Promise<ResponseDto> {
    const timekeeping = await this.timekeepingService.getTimekeepingById(id)
    return {
      statusCode: 200,
      messageCode: 'TIMEKEEPING_GET_BY_ID_SUCCESS',
      data: timekeeping,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bảng chấm công' })
  async getTimekeeping(@Query() paginateTimekeepingDto: PaginateTimekeepingDto): Promise<ResponseDto> {
    const timekeeping = await this.timekeepingService.getTimekeeping(paginateTimekeepingDto)
    return {
      statusCode: 200,
      messageCode: 'TIMEKEEPING_GET_ALL_SUCCESS',
      data: timekeeping.data,
      meta: timekeeping.meta,
    }
  }
}
