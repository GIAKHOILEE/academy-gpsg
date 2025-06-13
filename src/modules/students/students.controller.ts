import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { StudentsService } from './students.service'
import { CreateStudentsDto } from './dtos/create-students.dto'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateStudentsDto } from './dtos/paginate-students.dto'
import { UpdateStudentsDto } from './dtos/update-students.dto'

@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/students')
@ApiTags('Admin Students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản cho học viên' })
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
    const data = await this.studentsService.getAllStudents(paginateStudentsDto)
    return {
      statusCode: 200,
      messageCode: 'STUDENTS_GET_SUCCESS',
      data,
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
