import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { AttendanceService } from './attendance.service'
import { CreateAttendanceDto } from './dtos/create-attendance.dto'
import { HttpStatus } from '@nestjs/common'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@ApiTags('Admin Attendance')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async createAttendance(@Body() createAttendanceDto: CreateAttendanceDto): Promise<ResponseDto> {
    const attendance = await this.attendanceService.createAttendance(createAttendanceDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_CREATED_SUCCESSFULLY',
      data: attendance,
    })
  }

  @Get('report/:class_id')
  async getAttendanceReport(@Param('class_id') class_id: number): Promise<ResponseDto> {
    const report = await this.attendanceService.getAttendanceReport(class_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_REPORT_GET_SUCCESSFULLY',
      data: report,
    })
  }
}

@ApiTags('User Attendance')
@ApiBearerAuth()
@Auth()
@Controller('attendance')
export class UserAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('report/:class_id')
  async getAttendanceReport(@Param('class_id') class_id: number): Promise<ResponseDto> {
    const report = await this.attendanceService.getAttendanceReport(class_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ATTENDANCE_REPORT_GET_SUCCESSFULLY',
      data: report,
    })
  }
}
