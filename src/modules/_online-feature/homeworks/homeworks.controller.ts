import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { HomeworkService } from './homeworks.service'
import { CreateHomeworksDto } from './dtos/create-homeworks.dto'
import { PaginateHomeworksDto } from './dtos/paginate-homeworks.dto'

@Controller('admin/homeworks')
@ApiTags('Admin Homework')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminHomeworkController {
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
      data: homeworks,
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
