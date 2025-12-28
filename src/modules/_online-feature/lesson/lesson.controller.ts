import { Controller, Delete, Get, HttpStatus, Param, Post, Put, Query, Req } from '@nestjs/common'
import { Body } from '@nestjs/common'
import { ResponseDto } from '@common/response.dto'
import { PaginateLessonDto } from './dtos/paginate-lesson.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { CreateLessonDto } from './dtos/create-lesson.dto'
import { UpdateLessonDto } from './dtos/update-lesson.dto'
import { LessonService } from './lesson.service'

@Controller('admin/lessons')
@ApiTags('Admin Lesson')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminLessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lesson' })
  async createLesson(@Body() createLessonDto: CreateLessonDto): Promise<ResponseDto> {
    const lesson = await this.lessonService.createLesson(createLessonDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'LESSON_CREATED_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  async getManyLesson(@Query() paginateLessonDto: PaginateLessonDto, @Req() req): Promise<ResponseDto> {
    const lessons = await this.lessonService.getManyLesson(paginateLessonDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_MANY_SUCCESSFULLY',
      data: lessons,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by id' })
  async getLessonById(@Param('id') id: number): Promise<ResponseDto> {
    const lesson = await this.lessonService.getLessonById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_BY_ID_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lesson' })
  async updateLesson(@Param('id') id: number, @Body() updateLessonDto: UpdateLessonDto): Promise<ResponseDto> {
    const lesson = await this.lessonService.updateLesson(id, updateLessonDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_UPDATED_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index of a lesson' })
  async updateIndexLesson(@Param('id') id: number, @Query('index') index: number): Promise<ResponseDto> {
    await this.lessonService.updateIndex(id, index)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_INDEX_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lesson by id' })
  async deleteLesson(@Param('id') id: number): Promise<ResponseDto> {
    await this.lessonService.deleteLesson(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('teacher/lessons')
@ApiTags('Teacher Lesson')
@ApiBearerAuth()
@Auth(Role.TEACHER)
export class TeacherLessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lesson' })
  async createLesson(@Body() createLessonDto: CreateLessonDto): Promise<ResponseDto> {
    const lesson = await this.lessonService.createLesson(createLessonDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'LESSON_CREATED_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  async getManyLesson(@Query() paginateLessonDto: PaginateLessonDto, @Req() req): Promise<ResponseDto> {
    const lessons = await this.lessonService.getManyLesson(paginateLessonDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_MANY_SUCCESSFULLY',
      data: lessons,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by id' })
  async getLessonById(@Param('id') id: number): Promise<ResponseDto> {
    const lesson = await this.lessonService.getLessonById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_BY_ID_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lesson' })
  async updateLesson(@Param('id') id: number, @Body() updateLessonDto: UpdateLessonDto): Promise<ResponseDto> {
    const lesson = await this.lessonService.updateLesson(id, updateLessonDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_UPDATED_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index of a lesson' })
  async updateIndexLesson(@Param('id') id: number, @Query('index') index: number): Promise<ResponseDto> {
    await this.lessonService.updateIndex(id, index)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_INDEX_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lesson by id' })
  async deleteLesson(@Param('id') id: number): Promise<ResponseDto> {
    await this.lessonService.deleteLesson(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('lessons')
@ApiTags('User Lesson')
@ApiBearerAuth()
@Auth(Role.STUDENT, Role.TEACHER)
export class UserLessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  async getManyLesson(@Query() paginateLessonDto: PaginateLessonDto, @Req() req): Promise<ResponseDto> {
    const lessons = await this.lessonService.getManyLesson(paginateLessonDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_MANY_SUCCESSFULLY',
      data: lessons,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by id' })
  async getLessonById(@Param('id') id: number): Promise<ResponseDto> {
    const lesson = await this.lessonService.getLessonById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_BY_ID_SUCCESSFULLY',
      data: lesson,
    })
  }
}
