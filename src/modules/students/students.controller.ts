import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { StudentsService } from './students.service'
import { CreateStudentCardCodeDto, CreateStudentsDto } from './dtos/create-students.dto'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateStudentsDto } from './dtos/paginate-students.dto'
import { UpdateStudentCardCodeDto, UpdateStudentsDto } from './dtos/update-students.dto'

@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/students')
@ApiTags('Admin Students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('card-code')
  @ApiOperation({ summary: 'Tạo mã thẻ học viên' })
  async createStudentCardCode(@Body() createStudentCardCodeDto: CreateStudentCardCodeDto): Promise<ResponseDto> {
    const data = await this.studentsService.createStudentCardCode(createStudentCardCodeDto)
    return {
      statusCode: 201,
      messageCode: 'STUDENT_CARD_CODE_CREATE_SUCCESS',
      data,
    }
  }

  @Put('card-code')
  @ApiOperation({ summary: 'Cập nhật mã thẻ học viên' })
  async updateStudentCardCode(@Body() updateStudentCardCodeDto: UpdateStudentCardCodeDto): Promise<ResponseDto> {
    const data = await this.studentsService.updateStudentCardCode(updateStudentCardCodeDto)
    return {
      statusCode: 200,
      messageCode: 'STUDENT_CARD_CODE_UPDATE_SUCCESS',
      data,
    }
  }

  @Post()
  @ApiOperation({ summary: 'password: nếu không có mặc định là mã học viên' })
  async createStudent(@Body() createStudentDto: CreateStudentsDto): Promise<ResponseDto> {
    const data = await this.studentsService.createStudent(createStudentDto)
    return {
      statusCode: 201,
      messageCode: 'STUDENT_CREATE_SUCCESS',
      data,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách học viên, Status: 1: ACTIVE 2: INACTIVE' })
  async getStudents(@Query() paginateStudentsDto: PaginateStudentsDto): Promise<ResponseDto> {
    const students = await this.studentsService.getAllStudents(paginateStudentsDto)
    return {
      statusCode: 200,
      messageCode: 'STUDENTS_GET_SUCCESS',
      data: students.data,
      meta: students.meta,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin học viên theo ID' })
  async getStudentById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.studentsService.getStudentById(id)
    return {
      statusCode: 200,
      messageCode: 'STUDENT_GET_SUCCESS',
      data,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin học viên' })
  async updateStudent(@Param('id') id: number, @Body() updateStudentDto: UpdateStudentsDto): Promise<ResponseDto> {
    const data = await this.studentsService.updateStudent(id, updateStudentDto)
    return {
      statusCode: 200,
      messageCode: 'STUDENT_UPDATE_SUCCESS',
      data,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa học viên' })
  async deleteStudent(@Param('id') id: number): Promise<ResponseDto> {
    await this.studentsService.deleteStudent(id)
    return {
      statusCode: 200,
      messageCode: 'STUDENT_DELETE_SUCCESS',
    }
  }
}
