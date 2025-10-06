import { Body, Controller, HttpStatus, Post, Req } from '@nestjs/common'
import { CommentService } from './comment.service'
import { CreateCommentDto } from './dtos/create-comment.dto'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'

@Controller('student/comment')
@ApiTags('Student Comment')
export class StudentCommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Học sinh tạo bình luận' })
  async createComment(@Body() createCommentDto: CreateCommentDto): Promise<ResponseDto> {
    await this.commentService.createComment(createCommentDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'COMMENT_CREATED_SUCCESSFULLY',
    })
  }
}
