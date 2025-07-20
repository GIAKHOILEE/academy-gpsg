import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard'
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateEnrollmentsDto } from './dtos/create-enrollments.dto'
import { PaginateEnrollmentsDto } from './dtos/paginate-enrollments.dto'
import { UpdateEnrollmentsDto } from './dtos/update-enrollments.dto'
import { EnrollmentsService } from './enrollments.service'

@Controller('admin/enrollments')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@ApiTags('Admin Enrollments')
export class AdminEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @ApiOperation({ summary: 'Lấy danh sách đăng ký' })
  @Get()
  async getManyEnrollment(@Query() paginateEnrollmentsDto: PaginateEnrollmentsDto): Promise<ResponseDto> {
    const { data, meta } = await this.enrollmentsService.getManyEnrollment(paginateEnrollmentsDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENTS_GET_SUCCESS',
      data,
      meta,
    })
  }

  @ApiOperation({ summary: 'Lấy danh sách đăng ký đã xóa' })
  @Get('deleted')
  async getManySoftDelete(@Query() paginateEnrollmentsDto: PaginateEnrollmentsDto): Promise<ResponseDto> {
    const { data, meta } = await this.enrollmentsService.getManyEnrollment(paginateEnrollmentsDto, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENTS_GET_SUCCESS',
      data,
      meta,
    })
  }

  @ApiOperation({ summary: 'Lấy thông tin đăng ký theo ID' })
  @Get(':id')
  async getEnrollmentById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.enrollmentsService.getEnrollmentById(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENT_GET_SUCCESS',
      data,
    })
  }

  @ApiOperation({ summary: 'Cập nhật thông tin đăng ký' })
  @Put(':id')
  async updateEnrollment(@Param('id') id: number, @Body() updateEnrollmentDto: UpdateEnrollmentsDto): Promise<ResponseDto> {
    const data = await this.enrollmentsService.updateEnrollmentV2(id, updateEnrollmentDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENT_UPDATE_SUCCESS',
      data,
    })
  }

  @ApiOperation({ summary: 'Xóa đăng ký' })
  @Delete(':id')
  async deleteEnrollment(@Param('id') id: number): Promise<ResponseDto> {
    await this.enrollmentsService.deleteEnrollment(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENT_DELETE_SUCCESS',
    })
  }
}

@Controller('enrollments')
@ApiTags('Enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @ApiOperation({ summary: 'Đăng ký học' })
  @Post()
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  async createEnrollment(@Body() createEnrollmentDto: CreateEnrollmentsDto, @Request() req): Promise<ResponseDto> {
    const userId = req.user?.userId || null
    const isLogged = userId ? true : false
    const data = await this.enrollmentsService.createEnrollmentV2(createEnrollmentDto, isLogged, userId)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'ENROLLMENT_CREATE_SUCCESS',
      data,
    })
  }
}
