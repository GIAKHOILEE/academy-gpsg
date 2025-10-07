import { Body, Controller, HttpStatus, Post, Request } from '@nestjs/common'
import { CommentService } from './comment.service'
import { CreateCommentDto } from './dtos/create-comment.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'

@ApiBearerAuth()
@Auth(Role.STUDENT)
@Controller('student/comment')
@ApiTags('Student Comment')
export class StudentCommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Học sinh tạo bình luận' })
  async createComment(@Request() req, @Body() createCommentDto: CreateCommentDto): Promise<ResponseDto> {
    await this.commentService.createComment(createCommentDto, Role.STUDENT, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'COMMENT_CREATED_SUCCESSFULLY',
    })
  }
}

@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/comment')
@ApiTags('Teacher Comment')
export class TeacherCommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Giáo viên tạo bình luận' })
  async createComment(@Request() req, @Body() createCommentDto: CreateCommentDto): Promise<ResponseDto> {
    await this.commentService.createComment(createCommentDto, Role.TEACHER, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'COMMENT_CREATED_SUCCESSFULLY',
    })
  }
}
