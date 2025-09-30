import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ExamScoreService } from './exam-scores.service'
import { BulkExamScoreByStudentDto } from './dtos/create-exam-scores.dto'
import { ResponseDto } from '@common/response.dto'

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
  async getScoreboard(@Query('class_id') class_id: number): Promise<ResponseDto> {
    const result = await this.examScoreService.getClassScoreboard(class_id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'EXAM_SCORES_RETRIEVED_SUCCESS',
      data: result,
    })
  }
}
