import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ExamScoreService } from './exam-scores.service'
import { BulkExamScoreByStudentDto } from './dtos/create-exam-scores.dto'
import { ResponseDto } from '@common/response.dto'
import { PaginateExamScoresDto } from './dtos/paginate-exam-scores.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@ApiTags('Teacher Exam Scores')
@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/exam-scores')
export class TeacherExamScoreController {
  constructor(private readonly examScoreService: ExamScoreService) {}

  @Get('scoreboard')
  async getScoreboard(@Query() dto: PaginateExamScoresDto): Promise<ResponseDto> {
    const result = await this.examScoreService.getClassScoreboard(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'EXAM_SCORES_RETRIEVED_SUCCESS',
      data: result,
    })
  }
}

@Controller('exam-scores')
export class ExamScoreController {
  constructor(private readonly examScoreService: ExamScoreService) {}

  @Post('insert')
  async insertScoresSimple(@Body() dto: BulkExamScoreByStudentDto): Promise<ResponseDto> {
    await this.examScoreService.insertScoresSimple(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'EXAM_SCORES_INSERT_SUCCESS',
    })
  }

  @Get('scoreboard')
  async getScoreboard(@Query() dto: PaginateExamScoresDto): Promise<ResponseDto> {
    const result = await this.examScoreService.getClassScoreboard(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'EXAM_SCORES_RETRIEVED_SUCCESS',
      data: result,
    })
  }
}
