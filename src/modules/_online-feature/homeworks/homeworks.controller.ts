import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { HomeworkService } from './homeworks.service'
import { CreateHomeworksDto } from './dtos/create-homeworks.dto'
import { PaginateHomeworksDto, PaginateSubmissionsDto } from './dtos/paginate-homeworks.dto'
import { SubmitHomeworkDto } from './dtos/submit-homework.dto'
import { GradeSubmissionDto } from './dtos/submission-grade.dto'

@Controller('admin/homeworks')
@ApiTags('Admin Homework')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminHomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}
  // @Post('submit')
  // @ApiOperation({ summary: 'Submit a homework' })
  // async submitHomework(@Body() submitHomeworkDto: SubmitHomeworkDto, @Req() req): Promise<ResponseDto> {
  //   const submission = await this.homeworkService.submitHomework(req.user.userId, submitHomeworkDto)
  //   return new ResponseDto({
  //     statusCode: HttpStatus.OK,
  //     messageCode: 'HOMEWORK_SUBMITTED_SUCCESSFULLY',
  //     data: submission,
  //   })
  // }

  @Post()
  @ApiOperation({ summary: 'Create a homework' })
  async createHomework(@Body() createHomeworkDto: CreateHomeworksDto): Promise<ResponseDto> {
    const homework = await this.homeworkService.createHomework(createHomeworkDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'HOMEWORK_CREATED_SUCCESSFULLY',
      data: homework,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get many homeworks' })
  async getManyHomeworks(@Query() paginateHomeworksDto: PaginateHomeworksDto): Promise<ResponseDto> {
    const homeworks = await this.homeworkService.getManyHomeworks(paginateHomeworksDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORKS_FETCHED_SUCCESSFULLY',
      data: homeworks.data,
      meta: homeworks.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a homework' })
  async getHomeworkById(@Param('id') id: number): Promise<ResponseDto> {
    const homework = await this.homeworkService.getHomeworkById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_FETCHED_SUCCESSFULLY',
      data: homework,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a homework' })
  async updateHomework(@Param('id') id: number, @Body() updateHomeworkDto: CreateHomeworksDto): Promise<ResponseDto> {
    const homework = await this.homeworkService.updateHomework(id, updateHomeworkDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_UPDATED_SUCCESSFULLY',
      data: homework,
    })
  }
}

@Controller('teacher/homeworks')
@ApiTags('Teacher Homework')
@ApiBearerAuth()
@Auth(Role.TEACHER)
export class TeacherHomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a homework' })
  async createHomework(@Body() createHomeworkDto: CreateHomeworksDto): Promise<ResponseDto> {
    const homework = await this.homeworkService.createHomework(createHomeworkDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'HOMEWORK_CREATED_SUCCESSFULLY',
      data: homework,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get many homeworks' })
  async getManyHomeworks(@Query() paginateHomeworksDto: PaginateHomeworksDto): Promise<ResponseDto> {
    const homeworks = await this.homeworkService.getManyHomeworks(paginateHomeworksDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORKS_FETCHED_SUCCESSFULLY',
      data: homeworks.data,
      meta: homeworks.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a homework' })
  async getHomeworkById(@Param('id') id: number): Promise<ResponseDto> {
    const homework = await this.homeworkService.getHomeworkById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_FETCHED_SUCCESSFULLY',
      data: homework,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a homework' })
  async updateHomework(@Param('id') id: number, @Body() updateHomeworkDto: CreateHomeworksDto): Promise<ResponseDto> {
    const homework = await this.homeworkService.updateHomework(id, updateHomeworkDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_UPDATED_SUCCESSFULLY',
      data: homework,
    })
  }
}

@Controller('student/homeworks')
@ApiTags('Student Homework')
@ApiBearerAuth()
@Auth(Role.STUDENT)
export class StudentHomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}
  @Get()
  @ApiOperation({ summary: 'Get many homeworks' })
  async getManyHomeworks(@Query() paginateHomeworksDto: PaginateHomeworksDto): Promise<ResponseDto> {
    const homeworks = await this.homeworkService.getManyHomeworks(paginateHomeworksDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORKS_FETCHED_SUCCESSFULLY',
      data: homeworks.data,
      meta: homeworks.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a homework' })
  async getHomeworkById(@Param('id') id: number): Promise<ResponseDto> {
    const homework = await this.homeworkService.getHomeworkById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_FETCHED_SUCCESSFULLY',
      data: homework,
    })
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit a homework' })
  async submitHomework(@Body() submitHomeworkDto: SubmitHomeworkDto, @Req() req): Promise<ResponseDto> {
    const submission = await this.homeworkService.submitHomework(req.user.userId, submitHomeworkDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMITTED_SUCCESSFULLY',
      data: submission,
    })
  }
}

@Controller('admin/homeworks')
@ApiTags('Admin Homework Submission')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminHomeworkSubmissionController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get a homework submission' })
  async getHomeworkSubmissionById(@Param('id') id: number): Promise<ResponseDto> {
    const submission = await this.homeworkService.getSubmissionDetail(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSION_FETCHED_SUCCESSFULLY',
      data: submission,
    })
  }

  @Get(':homeworkId/submissions')
  @ApiOperation({ summary: 'lấy tất cả bài nộp của 1 homework' })
  async getSubmissionsByHomework(@Param('homeworkId') id: number, @Query() paginateSubmissionsDto: PaginateSubmissionsDto): Promise<ResponseDto> {
    const submissions = await this.homeworkService.getSubmissionsByHomework(id, paginateSubmissionsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSIONS_FETCHED_SUCCESSFULLY',
      data: submissions.data,
      meta: submissions.meta,
    })
  }

  @Post('grade')
  @ApiOperation({ summary: 'Admin chấm điểm bài tập' })
  async gradeSubmission(@Body() gradeSubmissionDto: GradeSubmissionDto, @Req() req): Promise<ResponseDto> {
    const submission = await this.homeworkService.gradeSubmission(req.user.userId, gradeSubmissionDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSION_GRADED_SUCCESSFULLY',
      data: submission,
    })
  }
}

@Controller('teacher/homeworks')
@ApiTags('Teacher Homework Submission')
@ApiBearerAuth()
@Auth(Role.TEACHER)
export class TeacherHomeworkSubmissionController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get a homework submission' })
  async getHomeworkSubmissionById(@Param('id') id: number): Promise<ResponseDto> {
    const submission = await this.homeworkService.getSubmissionDetail(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSION_FETCHED_SUCCESSFULLY',
      data: submission,
    })
  }

  @Get(':homeworkId/submissions')
  @ApiOperation({ summary: 'Get all submissions of a homework' })
  async getSubmissionsByHomework(@Param('homeworkId') id: number, @Query() paginateSubmissionsDto: PaginateSubmissionsDto): Promise<ResponseDto> {
    const submissions = await this.homeworkService.getSubmissionsByHomework(id, paginateSubmissionsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSIONS_FETCHED_SUCCESSFULLY',
      data: submissions.data,
      meta: submissions.meta,
    })
  }

  @Post('grade')
  @ApiOperation({ summary: 'Teacher chấm điểm bài tập' })
  async gradeSubmission(@Body() gradeSubmissionDto: GradeSubmissionDto, @Req() req): Promise<ResponseDto> {
    const submission = await this.homeworkService.gradeSubmission(req.user.userId, gradeSubmissionDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSION_GRADED_SUCCESSFULLY',
      data: submission,
    })
  }
}

@Controller('student/homeworks')
@ApiTags('Student Homework Submission')
@ApiBearerAuth()
@Auth(Role.STUDENT)
export class StudentHomeworkSubmissionController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get(':homeworkId/submissions')
  @ApiOperation({ summary: 'Get my submission of a homework' })
  async getMySubmission(@Param('homeworkId') id: number, @Req() req): Promise<ResponseDto> {
    const submission = await this.homeworkService.getMySubmission(req.user.userId, Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'HOMEWORK_SUBMISSION_FETCHED_SUCCESSFULLY',
      data: submission,
    })
  }
}
