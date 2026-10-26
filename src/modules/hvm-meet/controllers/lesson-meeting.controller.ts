import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
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
}
