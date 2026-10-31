import { Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common'
import { Body } from '@nestjs/common'
import { ResponseDto } from '@common/response.dto'
import { PaginateLessonDto } from './dtos/paginate-lesson.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { CreateLessonDto } from './dtos/create-lesson.dto'
import { UpdateLessonDto } from './dtos/update-lesson.dto'
import { AnswerVideoCheckDto, GetVideoProgressDto, UpdateVideoProgressDto } from './dtos/update-video-progress.dto'
import { LessonService } from './lesson.service'
import { VideoAttendanceService } from '../video-attendance/video-attendance.service'

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
      data: lessons.data,
      meta: lessons.meta,
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
      data: lessons.data,
      meta: lessons.meta,
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
  constructor(
    private readonly lessonService: LessonService,
    private readonly videoAttendanceService: VideoAttendanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  async getManyLesson(@Query() paginateLessonDto: PaginateLessonDto, @Req() req): Promise<ResponseDto> {
    const lessons = await this.lessonService.getManyLesson(paginateLessonDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_MANY_SUCCESSFULLY',
      data: lessons.data,
      meta: lessons.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by id' })
  async getLessonById(@Param('id') id: number, @Req() req): Promise<ResponseDto> {
    const lesson = await this.lessonService.getLessonById(id, req.user?.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_GET_BY_ID_SUCCESSFULLY',
      data: lesson,
    })
  }

  @Post(':id/video-progress')
  @ApiOperation({ summary: 'Gửi tiến độ xem video (các đoạn đã xem) — server tự điểm danh theo cấu hình của lớp' })
  async updateVideoProgress(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVideoProgressDto, @Req() req): Promise<ResponseDto> {
    const progress = await this.videoAttendanceService.heartbeat(id, req.user.userId, dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_VIDEO_PROGRESS_UPDATED_SUCCESSFULLY',
      data: progress,
    })
  }

  @Post(':id/video-progress/check')
  @ApiOperation({ summary: 'Trả lời bài kiểm tra "còn đang học" bật lên khi xem video' })
  async answerVideoCheck(@Param('id', ParseIntPipe) id: number, @Body() dto: AnswerVideoCheckDto, @Req() req): Promise<ResponseDto> {
    const progress = await this.videoAttendanceService.answerCheck(id, req.user.userId, dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_VIDEO_CHECK_ANSWERED',
      data: progress,
    })
  }

  @Get(':id/video-progress')
  @ApiOperation({ summary: 'Lấy tiến độ xem video bài học + quy tắc điểm danh của lớp' })
  async getVideoProgress(@Param('id', ParseIntPipe) id: number, @Query() query: GetVideoProgressDto, @Req() req): Promise<ResponseDto> {
    const progress = await this.videoAttendanceService.getProgress(id, req.user.userId, query.video_url)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'LESSON_VIDEO_PROGRESS_GET_SUCCESSFULLY',
      data: progress,
    })
  }
}
