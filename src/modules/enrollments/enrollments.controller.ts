import { ResponseDto } from '@common/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Query, Req, Request } from '@nestjs/common'
import { PaginateEnrollmentsDto } from './dtos/paginate-enrollments.dto'
import { EnrollmentsService } from './enrollments.service'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'
import { CreateEnrollmentsDto } from './dtos/create-enrollments.dto'

@Controller('admin/enrollments')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@ApiTags('Admin Enrollments')
export class AdminEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @ApiOperation({ summary: 'Lấy danh sách đăng ký' })
  @Get()
  async getManyEnrollment(@Query() paginateEnrollmentsDto: PaginateEnrollmentsDto): Promise<ResponseDto> {
    const { data, meta, summary } = await this.enrollmentsService.getManyEnrollment(paginateEnrollmentsDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENTS_GET_SUCCESS',
      data,
      meta: {
        ...meta,
        summary: {
          total_revenue: summary.total_revenue,
          total_prepaid: summary.total_prepaid,
          total_debt: summary.total_debt,
          total_fee: summary.total_fee,
        },
      },
    })
  }

  @ApiOperation({ summary: 'Lấy danh sách đăng ký đã xóa' })
  @Get('deleted')
  async getManySoftDelete(@Query() paginateEnrollmentsDto: PaginateEnrollmentsDto): Promise<ResponseDto> {
    const { data, meta, summary } = await this.enrollmentsService.getManyEnrollment(paginateEnrollmentsDto, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'ENROLLMENTS_GET_SUCCESS',
      data,
      meta: {
        ...meta,
        summary: {
          total_revenue: summary.total_revenue,
          total_prepaid: summary.total_prepaid,
          total_debt: summary.total_debt,
          total_fee: summary.total_fee,
        },
      },
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

  //   @ApiOperation({ summary: 'Cập nhật thông tin đăng ký' })
  //   @Put(':id')
  //   async updateEnrollment(@Param('id') id: number, @Body() updateEnrollmentDto: UpdateEnrollmentsDto): Promise<ResponseDto> {
  //     const data = await this.enrollmentsService.updateEnrollment(id, updateEnrollmentDto)
  //     return new ResponseDto({
  //       statusCode: 200,
  //       messageCode: 'ENROLLMENT_UPDATE_SUCCESS',
  //       data,
  //     })
  //   }

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
  async createEnrollment(@Body() createEnrollmentDto: CreateEnrollmentsDto, @Request() req): Promise<ResponseDto> {
    const userId = req.user?.id || null
    const isLogged = userId ? true : false
    const data = await this.enrollmentsService.createEnrollment(createEnrollmentDto, isLogged, userId)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'ENROLLMENT_CREATE_SUCCESS',
      data,
    })
  }
}
