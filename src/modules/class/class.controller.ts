import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ClassService } from './class.service'
import { CreateClassDto } from './dtos/create-class.dto'
import { PaginateClassDto } from './dtos/paginate-class.dto'
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
      data: classes,
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
@ApiBearerAuth()
@Auth()
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
      data: classes,
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
}
