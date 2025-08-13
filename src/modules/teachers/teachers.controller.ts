import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common'
import { TeachersService } from './teachers.service'
import { CreateTeachersDto } from './dtos/create-teachers.dto'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateTeachersDto } from './dtos/paginate-teachers.dto'
import { UpdateTeachersDto } from './dtos/update-teachers.dto'
import { PaginationDto } from '@common/pagination'

@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF, Role.TEACHER)
@Controller('admin/teachers')
@ApiTags('Admin Teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo giáo viên' })
  async createTeacher(@Body() createTeacherDto: CreateTeachersDto): Promise<ResponseDto> {
    const data = await this.teachersService.createTeacher(createTeacherDto)
    return {
      statusCode: 201,
      messageCode: 'TEACHER_CREATE_SUCCESS',
      data,
    }
  }

  @Get('classes')
  @ApiOperation({ summary: 'Lấy danh sách lớp của giáo viên' })
  async getClassesByTeacherId(@Query() paginateClassDto: PaginationDto, @Request() req): Promise<ResponseDto> {
    const classes = await this.teachersService.getAllClassesOfTeacher(req.user.userId, paginateClassDto)
    return {
      statusCode: 200,
      messageCode: 'TEACHER_GET_CLASSES_SUCCESS',
      data: classes.data,
      meta: classes.meta,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giáo viên' })
  async getTeachers(@Query() paginateTeachersDto: PaginateTeachersDto): Promise<ResponseDto> {
    const teachers = await this.teachersService.getTeachers(paginateTeachersDto)
    return {
      statusCode: 200,
      messageCode: 'TEACHER_GET_SUCCESS',
      data: teachers.data,
      meta: teachers.meta,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin giáo viên theo ID' })
  async getTeacherById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.teachersService.getTeacherById(id)
    return {
      statusCode: 200,
      messageCode: 'TEACHER_GET_SUCCESS',
      data,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin giáo viên' })
  async updateTeacher(@Param('id') id: number, @Body() updateTeacherDto: UpdateTeachersDto): Promise<ResponseDto> {
    const data = await this.teachersService.updateTeacher(id, updateTeacherDto)
    return {
      statusCode: 200,
      messageCode: 'TEACHER_UPDATE_SUCCESS',
      data,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giáo viên' })
  async deleteTeacher(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.teachersService.deleteTeacher(id)
    return {
      statusCode: 200,
      messageCode: 'TEACHER_DELETE_SUCCESS',
      data,
    }
  }
}
