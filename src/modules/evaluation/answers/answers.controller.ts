import { Body, Controller, Get, HttpStatus, Post, Query, Request } from '@nestjs/common'
import { AnswersService } from './answers.service'
import { ResponseDto } from '@common/response.dto'
import { PaginateAnswersDto } from './dtos/paginate-answers.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'
import { CreateAnswersDto } from './dtos/create-answers.dto'

@ApiTags('Admin Answers')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/evaluation/answers')
export class AdminAnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Get()
  async getAnswers(@Query() paginateAnswersDto: PaginateAnswersDto): Promise<ResponseDto> {
    const answers = await this.answersService.getAnswers(paginateAnswersDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANSWERS_FETCHED_SUCCESSFULLY',
      data: answers.data,
      // meta: answers.meta,
    })
  }
}

@ApiTags('User Answers')
@ApiBearerAuth()
@Auth(Role.STUDENT)
@Controller('evaluation/answers')
export class UserAnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  async createAnswers(@Body() createAnswersDto: CreateAnswersDto, @Request() req): Promise<ResponseDto> {
    const answers = await this.answersService.createAnswers(createAnswersDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'ANSWERS_CREATED_SUCCESSFULLY',
      data: answers,
    })
  }

  @Get()
  async getAnswers(@Query() paginateAnswersDto: PaginateAnswersDto): Promise<ResponseDto> {
    const answers = await this.answersService.getAnswers(paginateAnswersDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANSWERS_FETCHED_SUCCESSFULLY',
      data: answers.data,
      // meta: answers.meta,
    })
  }
}

@ApiTags('Teacher Answers')
@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/evaluation/answers')
export class TeacherAnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Get()
  async getAnswers(@Query() paginateAnswersDto: PaginateAnswersDto): Promise<ResponseDto> {
    const answers = await this.answersService.getAnswers(paginateAnswersDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANSWERS_FETCHED_SUCCESSFULLY',
      data: answers.data,
      // meta: answers.meta,
    })
  }
}
