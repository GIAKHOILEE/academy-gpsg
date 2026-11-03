import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { UpdateVideoAttendanceConfigDto } from './dtos/video-attendance-config.dto'
import { CreateVideoAttendanceQuestionDto, UpdateVideoAttendanceQuestionDto, VideoAttendanceQueryDto } from './dtos/video-attendance-question.dto'
import { VideoAttendanceService } from './video-attendance.service'

/**
 * Cấu hình điểm danh qua video + ngân hàng câu hỏi chống treo máy + báo cáo theo buổi.
 * Admin/staff dùng /admin/..., giảng viên dùng /teacher/... (chỉ lớp mình dạy).
 */
abstract class VideoAttendanceManageController {
  constructor(protected readonly service: VideoAttendanceService) {}

  protected guard(classId: number, req: any) {
    return this.service.assertCanManageClass(classId, req.user)
  }

  @Get('config')
  @ApiOperation({ summary: 'Lấy cấu hình điểm danh qua video của lớp' })
  async getConfig(@Param('classId', ParseIntPipe) classId: number, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({ statusCode: HttpStatus.OK, messageCode: 'VIDEO_ATTENDANCE_CONFIG_GET_SUCCESSFULLY', data: await this.service.getConfig(classId) })
  }

  @Put('config')
  @ApiOperation({ summary: 'Sửa cấu hình điểm danh qua video của lớp (chỉ trường được gửi)' })
  async updateConfig(@Param('classId', ParseIntPipe) classId: number, @Body() dto: UpdateVideoAttendanceConfigDto, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'VIDEO_ATTENDANCE_CONFIG_UPDATED_SUCCESSFULLY',
      data: await this.service.updateConfig(classId, dto, req.user?.userId),
    })
  }

  @Get('questions')
  @ApiOperation({ summary: 'Danh sách câu hỏi kiểm tra (kèm đáp án — chỉ cho người quản lý lớp)' })
  async listQuestions(@Param('classId', ParseIntPipe) classId: number, @Query() query: VideoAttendanceQueryDto, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'VIDEO_ATTENDANCE_QUESTIONS_GET_SUCCESSFULLY',
      data: await this.service.listQuestions(classId, query.lesson_id),
    })
  }

  @Post('questions')
  @ApiOperation({ summary: 'Thêm câu hỏi kiểm tra' })
  async createQuestion(@Param('classId', ParseIntPipe) classId: number, @Body() dto: CreateVideoAttendanceQuestionDto, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'VIDEO_ATTENDANCE_QUESTION_CREATED_SUCCESSFULLY',
      data: await this.service.createQuestion(classId, dto, req.user?.userId),
    })
  }

  @Put('questions/:id')
  @ApiOperation({ summary: 'Sửa câu hỏi kiểm tra' })
  async updateQuestion(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoAttendanceQuestionDto,
    @Req() req,
  ): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'VIDEO_ATTENDANCE_QUESTION_UPDATED_SUCCESSFULLY',
      data: await this.service.updateQuestion(classId, id, dto),
    })
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Xoá câu hỏi kiểm tra' })
  async deleteQuestion(@Param('classId', ParseIntPipe) classId: number, @Param('id', ParseIntPipe) id: number, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    await this.service.deleteQuestion(classId, id)
    return new ResponseDto({ statusCode: HttpStatus.OK, messageCode: 'VIDEO_ATTENDANCE_QUESTION_DELETED_SUCCESSFULLY' })
  }

  @Get('report')
  @ApiOperation({ summary: 'Tiến độ xem video & kết quả kiểm tra của từng học viên trong một buổi' })
  async report(@Param('classId', ParseIntPipe) classId: number, @Query() query: VideoAttendanceQueryDto, @Req() req): Promise<ResponseDto> {
    await this.guard(classId, req)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'VIDEO_ATTENDANCE_REPORT_GET_SUCCESSFULLY',
      data: await this.service.report(classId, Number(query.lesson_id)),
    })
  }
}

@Controller('admin/classes/:classId/video-attendance')
@ApiTags('Admin Video Attendance')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminVideoAttendanceController extends VideoAttendanceManageController {
  constructor(service: VideoAttendanceService) {
    super(service)
  }
}

@Controller('teacher/classes/:classId/video-attendance')
@ApiTags('Teacher Video Attendance')
@ApiBearerAuth()
@Auth(Role.TEACHER)
export class TeacherVideoAttendanceController extends VideoAttendanceManageController {
  constructor(service: VideoAttendanceService) {
    super(service)
  }
}
