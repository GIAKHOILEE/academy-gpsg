import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { AttendanceService } from './attendance.service'
import { CreateAttendanceDto } from './dtos/create-attendance.dto'
import { HttpStatus } from '@nestjs/common'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { UpdateAttendanceDto } from './dtos/update-attendance.dto'
import { PaginateAttendanceDto } from './dtos/paginate-attendance.dto'

@ApiTags('Admin Attendance')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('class/:class_id')
  @ApiOperation({ summary: 'Lấy lịch sử điểm danh' })
  async getAttendanceReport(@Param('class_id') class_id: number, @Query() paginateAttendanceDto: PaginateAttendanceDto): Promise<ResponseDto> {
    const report = await this.attendanceService.getAttendanceReport(class_id, paginateAttendanceDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_REPORT_GET_SUCCESSFULLY',
      data: report,
    })
  }

  @Put('class/:class_id')
  @ApiOperation({ summary: 'Cập nhật điểm danh của học viên' })
  @ApiBody({ type: UpdateAttendanceDto, isArray: true })
  async updateAttendance(@Param('class_id') class_id: number, @Body() updateAttendanceDtos: UpdateAttendanceDto[]): Promise<ResponseDto> {
    const attendance = await this.attendanceService.updateAttendance(class_id, updateAttendanceDtos)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_UPDATED_SUCCESSFULLY',
      data: attendance,
    })
  }
}

@ApiTags('User Attendance')
@Controller('attendance')
export class UserAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @ApiOperation({ summary: 'Điểm danh' })
  async createAttendance(@Body() createAttendanceDto: CreateAttendanceDto): Promise<ResponseDto> {
    const attendance = await this.attendanceService.createAttendance(createAttendanceDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_CREATED_SUCCESSFULLY',
      data: attendance,
    })
  }

  @Get('class/:class_id')
  @ApiBearerAuth()
  @Auth()
  @ApiOperation({ summary: 'Lấy lịch sử điểm danh' })
  async getAttendanceReport(@Param('class_id') class_id: number, @Query() paginateAttendanceDto: PaginateAttendanceDto): Promise<ResponseDto> {
    const report = await this.attendanceService.getAttendanceReport(class_id, paginateAttendanceDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_REPORT_GET_SUCCESSFULLY',
      data: report,
    })
  }
}
