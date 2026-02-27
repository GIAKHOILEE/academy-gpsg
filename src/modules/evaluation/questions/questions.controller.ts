import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { QuestionsService, QuestionsStatisticsService } from './questions.service'
import { PaginateQuestionsDto } from './dtos/pagiante-questions.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'
import { CreateQuestionsDto } from './dtos/create-questions.dto'
import { UpdateQuestionsDto } from './dtos/update-questions.dto'

@ApiTags('Admin Questions')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/evaluation/questions')
export class AdminQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async paginateQuestions(@Query() paginateQuestionsDto: PaginateQuestionsDto): Promise<ResponseDto> {
    const questions = await this.questionsService.paginateQuestions(paginateQuestionsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTIONS_FETCHED_SUCCESSFULLY',
      data: questions.data,
      meta: questions.meta,
    })
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: number): Promise<ResponseDto> {
    const question = await this.questionsService.getQuestionById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_FETCHED_SUCCESSFULLY',
      data: question,
    })
  }

  @Post()
  async createQuestion(@Body() createQuestionDto: CreateQuestionsDto): Promise<ResponseDto> {
    const question = await this.questionsService.createQuestion(createQuestionDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'QUESTION_CREATED_SUCCESSFULLY',
      data: question,
    })
  }

  @Put(':id')
  async updateQuestion(@Param('id') id: number, @Body() updateQuestionDto: UpdateQuestionsDto): Promise<ResponseDto> {
    await this.questionsService.updateQuestion(id, updateQuestionDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  async deleteQuestion(@Param('id') id: number): Promise<ResponseDto> {
    await this.questionsService.deleteQuestion(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('User Questions')
@Controller('evaluation/questions')
export class UserQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async paginateQuestions(@Query() paginateQuestionsDto: PaginateQuestionsDto): Promise<ResponseDto> {
    const questions = await this.questionsService.paginateQuestions(paginateQuestionsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTIONS_FETCHED_SUCCESSFULLY',
      data: questions.data,
      meta: questions.meta,
    })
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: number): Promise<ResponseDto> {
    const question = await this.questionsService.getQuestionById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_FETCHED_SUCCESSFULLY',
      data: question,
    })
  }
}

@ApiTags('Teacher Questions')
@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/evaluation/questions')
export class TeacherQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async paginateQuestions(@Query() paginateQuestionsDto: PaginateQuestionsDto): Promise<ResponseDto> {
    const questions = await this.questionsService.paginateQuestions(paginateQuestionsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTIONS_FETCHED_SUCCESSFULLY',
      data: questions.data,
      meta: questions.meta,
    })
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: number): Promise<ResponseDto> {
    const question = await this.questionsService.getQuestionById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_FETCHED_SUCCESSFULLY',
      data: question,
    })
  }
}

// thống kê câu hỏi
@ApiTags('Admin Questions Statistics')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/evaluation/questions/statistics')
export class AdminQuestionsStatisticsController {
  constructor(private readonly questionsStatisticsService: QuestionsStatisticsService) {}

  @Get(':id')
  async statisticQuestion(@Param('id') id: number): Promise<ResponseDto> {
    const statistics = await this.questionsStatisticsService.statisticQuestion(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'QUESTION_STATISTICS_FETCHED_SUCCESSFULLY',
      data: statistics,
    })
  }
}
