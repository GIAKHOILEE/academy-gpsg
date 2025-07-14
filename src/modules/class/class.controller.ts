import { PaginationDto } from '@common/pagination'
import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Query, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ClassService } from './class.service'
import { CreateClassDto } from './dtos/create-class.dto'
import { GetStudentsOfClassDto, PaginateClassDto } from './dtos/paginate-class.dto'
import { UpdateClassDto } from './dtos/update-class.dto'

@ApiTags('Admin Classes')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/classes')
export class AdminClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  async createClass(@Body() createClassDto: CreateClassDto): Promise<ResponseDto> {
    const classEntity = await this.classService.createClass(createClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CLASS_CREATED_SUCCESSFULLY',
      data: classEntity,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes' })
  async getClasses(@Query() paginateClassDto: PaginateClassDto): Promise<ResponseDto> {
    const classes = await this.classService.getAllClasses(paginateClassDto, true)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASSES_FETCHED_SUCCESSFULLY',
      data: classes.data,
      meta: classes.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to get' })
  async getClassById(@Param('id') id: number): Promise<ResponseDto> {
    const classEntity = await this.classService.getClassById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_FETCHED_SUCCESSFULLY',
      data: classEntity,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to update' })
  async updateClass(@Param('id') id: number, @Body() updateClassDto: UpdateClassDto): Promise<ResponseDto> {
    await this.classService.updateClass(id, updateClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_UPDATED_SUCCESSFULLY',
    })
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get students of a class' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to get students' })
  async getStudentsOfClass(@Param('id') id: number, @Query() getStudentsOfClassDto: GetStudentsOfClassDto): Promise<ResponseDto> {
    const students = await this.classService.getStudentsOfClass(id, getStudentsOfClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STUDENTS_FETCHED_SUCCESSFULLY',
      data: students.data,
      meta: students.meta,
    })
  }

  @Patch(':id/is-active')
  @ApiOperation({ summary: 'Update the is_active status of a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to update' })
  async updateIsActive(@Param('id') id: number): Promise<ResponseDto> {
    await this.classService.updateIsActive(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_IS_ACTIVE_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to delete' })
  async deleteClass(@Param('id') id: number): Promise<ResponseDto> {
    await this.classService.deleteClass(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('User Classes')
@Controller('classes')
export class UserClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({ summary: 'Get all classes' })
  async getClasses(@Query() paginateClassDto: PaginateClassDto): Promise<ResponseDto> {
    const classes = await this.classService.getAllClasses(paginateClassDto, false)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASSES_FETCHED_SUCCESSFULLY',
      data: classes.data,
      meta: classes.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to get' })
  async getClassById(@Param('id') id: number): Promise<ResponseDto> {
    const classEntity = await this.classService.getClassById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_FETCHED_SUCCESSFULLY',
      data: classEntity,
    })
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get students of a class' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to get students' })
  async getStudentsOfClass(@Param('id') id: number, @Query() getStudentsOfClassDto: GetStudentsOfClassDto): Promise<ResponseDto> {
    const students = await this.classService.getStudentsOfClass(id, getStudentsOfClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STUDENTS_FETCHED_SUCCESSFULLY',
      data: students.data,
      meta: students.meta,
    })
  }
}

@ApiTags('Student Classes')
@Controller('student/classes')
@ApiBearerAuth()
@Auth(Role.STUDENT)
export class StudentClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({ summary: 'Get all classes of student' })
  async getClassesOfStudent(@Request() req, @Query() paginateClassDto: PaginationDto): Promise<ResponseDto> {
    const classes = await this.classService.getClassesOfStudent(req.user.userId, paginateClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASSES_FETCHED_SUCCESSFULLY',
      data: classes.data,
      meta: classes.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the class to get students' })
  async studentGetStudentsOfClass(@Param('id') id: number, @Query() getStudentsOfClassDto: GetStudentsOfClassDto): Promise<ResponseDto> {
    const students = await this.classService.studentGetStudentsOfClass(id, getStudentsOfClassDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STUDENTS_FETCHED_SUCCESSFULLY',
      data: students.data,
      meta: students.meta,
    })
  }
}
