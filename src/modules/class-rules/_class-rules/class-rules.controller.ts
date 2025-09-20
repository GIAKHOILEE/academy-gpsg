import { Controller, Post, Body, Put, Param, Delete, HttpStatus, Get, Query } from '@nestjs/common'
import { ClassRulesService } from './class-rules.service'
import { CreateClassRulesDto } from './dtos/create-class-rules.dto'
import { UpdateClassRulesDto } from './dtos/update-class-rules.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { PaginateClassRulesDto } from './dtos/paginate-class-rules.dto'

@Controller('admin/class-rules')
@ApiTags('Admin Class Rules')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminClassRulesController {
  constructor(private readonly classRulesService: ClassRulesService) {}
  @Post()
  @ApiOperation({ summary: 'Tạo quy tắc lớp học' })
  async createClassRules(@Body() createClassRulesDto: CreateClassRulesDto): Promise<ResponseDto> {
    const classRules = await this.classRulesService.createClassRules(createClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CLASS_RULES_CREATED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả quy tắc lớp học' })
  async getAllClassRules(@Query() paginateClassRulesDto: PaginateClassRulesDto): Promise<ResponseDto> {
    const classRules = await this.classRulesService.getAllClassRules(paginateClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_FETCHED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Get(':class_id')
  @ApiOperation({ summary: 'Lấy quy tắc lớp học theo ID lớp' })
  async getClassRulesByClassId(@Param('class_id') class_id: number): Promise<ResponseDto> {
    const classRules = await this.classRulesService.getClassRulesByClassId(class_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_FETCHED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật quy tắc lớp học' })
  async updateClassRules(@Param('id') id: number, @Body() updateClassRulesDto: UpdateClassRulesDto): Promise<ResponseDto> {
    await this.classRulesService.updateClassRules(id, updateClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quy tắc lớp học' })
  async deleteClassRules(@Param('id') id: number): Promise<ResponseDto> {
    await this.classRulesService.deleteClassRules(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('teacher/class-rules')
@ApiTags('Teacher Class Rules')
@ApiBearerAuth()
@Auth(Role.TEACHER)
export class TeacherClassRulesController {
  constructor(private readonly classRulesService: ClassRulesService) {}
  @Post()
  @ApiOperation({ summary: 'Tạo quy tắc lớp học' })
  async createClassRules(@Body() createClassRulesDto: CreateClassRulesDto): Promise<ResponseDto> {
    const classRules = await this.classRulesService.createClassRules(createClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CLASS_RULES_CREATED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả quy tắc lớp học' })
  async getAllClassRules(@Query() paginateClassRulesDto: PaginateClassRulesDto): Promise<ResponseDto> {
    const classRules = await this.classRulesService.getAllClassRules(paginateClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_FETCHED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Get(':class_id')
  @ApiOperation({ summary: 'Lấy quy tắc lớp học theo ID lớp' })
  async getClassRulesByClassId(@Param('class_id') class_id: number): Promise<ResponseDto> {
    const classRules = await this.classRulesService.getClassRulesByClassId(class_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_FETCHED_SUCCESSFULLY',
      data: classRules,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật quy tắc lớp học' })
  async updateClassRules(@Param('id') id: number, @Body() updateClassRulesDto: UpdateClassRulesDto): Promise<ResponseDto> {
    await this.classRulesService.updateClassRules(id, updateClassRulesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quy tắc lớp học' })
  async deleteClassRules(@Param('id') id: number): Promise<ResponseDto> {
    await this.classRulesService.deleteClassRules(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('student/class-rules')
@ApiTags('Student Class Rules')
@ApiBearerAuth()
@Auth(Role.STUDENT)
export class UserClassRulesController {
  constructor(private readonly classRulesService: ClassRulesService) {}

  @Get(':class_id')
  @ApiOperation({ summary: 'Lấy quy tắc lớp học theo ID lớp' })
  async getClassRulesByClassId(@Param('class_id') class_id: number): Promise<ResponseDto> {
    const classRules = await this.classRulesService.getClassRulesByClassId(class_id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_RULES_FETCHED_SUCCESSFULLY',
      data: classRules,
    })
  }
}
