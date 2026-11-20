import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PublicLinkRequestDto } from '../dtos/hvm-meet-room-policy.dto'
import { LessonMeetingService } from '../services/lesson-meeting.service'

@Controller('lessons')
@ApiTags('User Lesson')
@ApiBearerAuth()
@Auth(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.STAFF)
export class LessonMeetingController {
  constructor(private readonly lessonMeetingService: LessonMeetingService) {}

  @Post(':id/meeting/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy vé vào phòng học HVM Meet của buổi học',
    description:
      'Chỉ cho buổi học có meeting_provider = hvm_meet. Giảng viên của lớp vào với vai trò host, admin/giáo vụ cohost, ' +
      'học viên học trực tuyến (learn_type MEETING) participant. Vé dùng một lần, hết hạn sau ~2 phút: gọi ngay trước khi mở phòng.',
  })
  async joinMeeting(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_JOIN_SUCCESSFULLY',
      data: await this.lessonMeetingService.joinLesson(id, req.user),
    })
  }

  @Get(':id/meeting/sessions')
  @ApiOperation({
    summary: 'Các buổi HVM Meet đã diễn ra của buổi học (để xem lại)',
    description: 'Giảng viên của lớp, admin/giáo vụ, và mọi học viên trong lớp. Mới nhất trước.',
  })
  async getMeetingSessions(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_SESSIONS_FETCHED_SUCCESSFULLY',
      data: await this.lessonMeetingService.listSessions(id, req.user),
    })
  }

  @Post(':id/meeting/sessions/:sessionId/replay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy link trang xem lại buổi học (video + trò chuyện + cảm xúc + sự kiện đồng bộ)',
    description: 'Link dùng một lần, hết hạn nhanh: gọi mỗi lần mở trang xem lại rồi nhúng bằng iframe.',
  })
  async createReplay(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() req,
  ): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_REPLAY_CREATED_SUCCESSFULLY',
      data: await this.lessonMeetingService.createReplay(id, sessionId, req.user),
    })
  }

  @Get(':id/meeting/sessions/:sessionId/archive')
  @ApiOperation({ summary: 'Biên bản đầy đủ của buổi HVM Meet (chỉ admin / giáo vụ)' })
  async getArchive(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() req,
  ): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_ARCHIVE_FETCHED_SUCCESSFULLY',
      data: await this.lessonMeetingService.getArchive(id, sessionId, req.user),
    })
  }

  @Post(':id/meeting/public-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link công khai (/p/...) của phòng HVM Meet của buổi học',
    description:
      'Admin/giáo vụ hoặc giảng viên của lớp. rotate = true đổi link (link cũ chết ngay), chỉ admin/giáo vụ. ' +
      'Đồng bộ phòng trước khi lấy link. access_mode = account nghĩa là link có nhưng báo "không mở".',
  })
  async getPublicLink(@Param('id', ParseIntPipe) id: number, @Body() dto: PublicLinkRequestDto, @Req() req): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_PUBLIC_LINK_FETCHED_SUCCESSFULLY',
      data: await this.lessonMeetingService.getPublicLink(id, req.user, Boolean(dto?.rotate)),
    })
  }

  @Get(':id/meeting/sessions/:sessionId/attendance')
  @ApiOperation({
    summary: 'Báo cáo điểm danh HVM Meet của một buổi (admin/giáo vụ, giảng viên của lớp)',
    description: 'Chuyển tiếp báo cáo của HVM Meet, kèm academySynced = đã ghi vào sổ điểm danh lớp.',
  })
  async getSessionAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() req,
  ): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_MEETING_ATTENDANCE_FETCHED_SUCCESSFULLY',
      data: await this.lessonMeetingService.getSessionAttendance(id, sessionId, req.user),
    })
  }
}
