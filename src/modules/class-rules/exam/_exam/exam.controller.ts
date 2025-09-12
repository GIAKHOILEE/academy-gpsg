import { Controller, Post, Body, Put, Param, Delete, HttpStatus, Get, Query } from '@nestjs/common'
import { ExamService } from './exam.service'
import { CreateExamDto } from './dtos/create-exam.dto'
import { UpdateExamDto } from './dtos/update-exam.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { PaginateExamDto } from './dtos/paginate-exam.dto'

@Controller('admin/exam')
@ApiTags('Admin Exam')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminExamController {
  constructor(private readonly examService: ExamService) {}
  @Post()
  @ApiOperation({ summary: 'Tạo bài kiểm tra' })
  async createExam(@Body() createExamDto: CreateExamDto): Promise<ResponseDto> {
    const exam = await this.examService.createExam(createExamDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'EXAM_CREATED_SUCCESSFULLY',
      data: exam,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bài kiểm tra' })
  async getExams(@Query() paginateExamDto: PaginateExamDto): Promise<ResponseDto> {
    const exams = await this.examService.getExams(paginateExamDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAMS_FOUND_SUCCESSFULLY',
      data: exams.data,
      meta: exams.meta,
    })
  }
  @Get(':id')
  @ApiOperation({ summary: 'Lấy bài kiểm tra theo id' })
  async getExamById(@Param('id') id: number): Promise<ResponseDto> {
    const exam = await this.examService.getExamById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAM_FOUND_SUCCESSFULLY',
      data: exam,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài kiểm tra' })
  async updateExam(@Param('id') id: number, @Body() updateExamDto: UpdateExamDto): Promise<ResponseDto> {
    await this.examService.updateExam(id, updateExamDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAM_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bài kiểm tra' })
  async deleteExam(@Param('id') id: number): Promise<ResponseDto> {
    await this.examService.deleteExam(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAM_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('exam')
@ApiTags('User Exam')
@ApiBearerAuth()
@Auth()
export class UserExamController {
  constructor(private readonly examService: ExamService) {}
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bài kiểm tra' })
  async getExams(@Query() paginateExamDto: PaginateExamDto): Promise<ResponseDto> {
    const exams = await this.examService.getExams(paginateExamDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAMS_FOUND_SUCCESSFULLY',
      data: exams.data,
      meta: exams.meta,
    })
  }
  @Get(':id')
  @ApiOperation({ summary: 'Lấy bài kiểm tra theo id' })
  async getExamById(@Param('id') id: number): Promise<ResponseDto> {
    const exam = await this.examService.getExamById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EXAM_FOUND_SUCCESSFULLY',
      data: exam,
    })
  }
}
