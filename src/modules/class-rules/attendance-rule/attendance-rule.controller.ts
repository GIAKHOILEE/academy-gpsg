import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { AttendanceRuleService } from './attendance-rule.service'
import { ResponseDto } from '@common/response.dto'
import { CreateAttendanceRuleDto } from './dtos/create-attendance-rule.dto'
import { PaginateAttendanceRuleDto } from './dtos/paginate-attendance-rule.dto'
import { UpdateAttendanceRuleDto } from './dtos/update-attendance-rule.dto'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@ApiTags('Admin Attendance Rules')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/attendance-rules')
export class AdminAttendanceRuleController {
  constructor(private readonly attendanceRuleService: AttendanceRuleService) {}

  @Post('class/:class_id')
  @ApiOperation({ summary: 'Tạo quy tắc điểm danh' })
  @ApiBody({ type: [CreateAttendanceRuleDto] })
  async createAttendanceRule(@Param('class_id') class_id: number, @Body() createAttendanceRuleDto: CreateAttendanceRuleDto[]): Promise<ResponseDto> {
    const attendanceRule = await this.attendanceRuleService.createAttendanceRule(class_id, createAttendanceRuleDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'ATTENDANCE_RULE_CREATED_SUCCESSFULLY',
      data: attendanceRule,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả quy tắc điểm danh' })
  async getAllAttendanceRule(@Query() paginateAttendanceRuleDto: PaginateAttendanceRuleDto): Promise<ResponseDto> {
    const attendanceRules = await this.attendanceRuleService.getAllAttendanceRule(paginateAttendanceRuleDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_GET_ALL_SUCCESSFULLY',
      data: attendanceRules,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết quy tắc điểm danh' })
  async getDetailAttendanceRule(@Param('id') id: number): Promise<ResponseDto> {
    const attendanceRule = await this.attendanceRuleService.getDetailAttendanceRule(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_GET_DETAIL_SUCCESSFULLY',
      data: attendanceRule,
    })
  }

  @Put('class/:class_id')
  @ApiOperation({ summary: 'Cập nhật quy tắc điểm danh' })
  @ApiBody({ type: [UpdateAttendanceRuleDto] })
  async updateAttendanceRule(@Param('class_id') class_id: number, @Body() updateAttendanceRuleDto: UpdateAttendanceRuleDto[]): Promise<ResponseDto> {
    await this.attendanceRuleService.updateAttendanceRule(class_id, updateAttendanceRuleDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_UPDATED_SUCCESSFULLY',
    })
  }

  // @Delete(':id')
  // async deleteAttendanceRule(@Param('id') id: number): Promise<ResponseDto> {
  //   await this.attendanceRuleService.deleteAttendanceRule(id)
  //   return new ResponseDto({
  //     statusCode: HttpStatus.OK,
  //     messageCode: 'ATTENDANCE_RULE_DELETED_SUCCESSFULLY',
  //   })
  // }
}

@ApiTags('User Attendance Rules')
@Controller('attendance-rules')
export class UserAttendanceRuleController {
  constructor(private readonly attendanceRuleService: AttendanceRuleService) {}

  @Get('/class/today')
  @ApiOperation({ summary: 'Lấy danh sách lớp đang trong thời gian điểm danh' })
  @ApiQuery({ name: 'card_code', required: true, type: String, description: 'Mã thẻ của học viên' })
  async getTodayAttendanceClass(@Query('card_code') card_code: string): Promise<ResponseDto> {
    const classes = await this.attendanceRuleService.getTodayAttendanceClass(card_code)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_GET_CLASS_TODAY_SUCCESSFULLY',
      data: classes,
    })
  }

  @Get()
  @ApiBearerAuth()
  @Auth()
  @ApiOperation({ summary: 'Lấy tất cả quy tắc điểm danh' })
  async getAllAttendanceRule(@Query() paginateAttendanceRuleDto: PaginateAttendanceRuleDto): Promise<ResponseDto> {
    const attendanceRules = await this.attendanceRuleService.getAllAttendanceRule(paginateAttendanceRuleDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_GET_ALL_SUCCESSFULLY',
      data: attendanceRules,
    })
  }

  @Get(':id')
  @ApiBearerAuth()
  @Auth()
  @ApiOperation({ summary: 'Lấy chi tiết quy tắc điểm danh' })
  async getDetailAttendanceRule(@Param('id') id: number): Promise<ResponseDto> {
    const attendanceRule = await this.attendanceRuleService.getDetailAttendanceRule(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_RULE_GET_DETAIL_SUCCESSFULLY',
      data: attendanceRule,
    })
  }
}
