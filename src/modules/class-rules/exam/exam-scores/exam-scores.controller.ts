import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'
import { ExamScoreService, ExamScoreServiceV2 } from './exam-scores.service'
import { BulkExamScoreByStudentDto, CreateClassStudentScoreDto } from './dtos/create-exam-scores.dto'
import { UpdateClassStudentScoreDto } from './dtos/update-class-student-score.dto'
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

@ApiTags('Admin Exam Scores')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/exam/scores')
export class AdminExamScoreControllerV2 {
  constructor(private readonly examScoreService: ExamScoreServiceV2) {}

  @Post()
  async insertScoresSimple(@Body() dto: CreateClassStudentScoreDto): Promise<ResponseDto> {
    await this.examScoreService.createClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_INSERT_SUCCESS',
    })
  }

  @Put()
  async updateScores(@Body() dto: UpdateClassStudentScoreDto): Promise<ResponseDto> {
    await this.examScoreService.updateClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_UPDATE_SUCCESS',
    })
  }

  @Get()
  async getScores(@Query() dto: PaginateExamScoresDto): Promise<ResponseDto> {
    const result = await this.examScoreService.getClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_RETRIEVED_SUCCESS',
      data: result.data,
      meta: result.meta,
    })
  }
}

@ApiTags('Teacher Exam Scores')
@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/exam/scores')
export class TeacherExamScoreControllerV2 {
  constructor(private readonly examScoreService: ExamScoreServiceV2) {}

  @Post()
  async insertScoresSimple(@Body() dto: CreateClassStudentScoreDto): Promise<ResponseDto> {
    await this.examScoreService.createClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_INSERT_SUCCESS',
    })
  }

  @Put()
  async updateScores(@Body() dto: UpdateClassStudentScoreDto): Promise<ResponseDto> {
    await this.examScoreService.updateClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_UPDATE_SUCCESS',
    })
  }

  @Get()
  async getScores(@Query() dto: PaginateExamScoresDto): Promise<ResponseDto> {
    const result = await this.examScoreService.getClassStudentScores(dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'SCORES_RETRIEVED_SUCCESS',
      data: result.data,
      meta: result.meta,
    })
  }
}
