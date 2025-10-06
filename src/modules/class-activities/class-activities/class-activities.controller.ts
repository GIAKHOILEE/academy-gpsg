import { ResponseDto } from '@common/response.dto'
import { ClassActivitiesService } from './class-activities.service'
import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateClassActivitiesDto } from './dtos/create-class-activities.dto'
import { PaginateClassActivitiesDto } from './dtos/paginate-class-activities.dto'
import { UpdateClassActivitiesDto } from './dtos/update-class-activities.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@ApiTags('Admin Class Activities')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/class-activities')
export class AdminClassActivitiesController {
  constructor(private readonly classActivitiesService: ClassActivitiesService) {}

  //   @Post()
  //   @ApiOperation({ summary: 'Tạo hoạt động lớp học' })
  //   async createClassActivities(@Body() createClassActivitiesDto: CreateClassActivitiesDto): Promise<ResponseDto> {
  //     const classActivities = await this.classActivitiesService.createClassActivities(createClassActivitiesDto)
  //     return new ResponseDto({
  //       statusCode: HttpStatus.CREATED,
  //       messageCode: 'CLASS_ACTIVITIES_CREATED_SUCCESSFULLY',
  //       data: classActivities,
  //     })
  //   }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hoạt động lớp học theo ID' })
  async getClassActivitiesById(@Param('id') id: number): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivitiesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả hoạt động lớp học' })
  async getClassActivities(@Query() paginateClassActivitiesDto: PaginateClassActivitiesDto): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivities(paginateClassActivitiesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  //   @Put(':id')
  //   @ApiOperation({ summary: 'Cập nhật hoạt động lớp học' })
  //   async updateClassActivities(@Param('id') id: number, @Body() updateClassActivitiesDto: UpdateClassActivitiesDto): Promise<ResponseDto> {
  //     await this.classActivitiesService.updateClassActivities(id, updateClassActivitiesDto)
  //     return new ResponseDto({
  //       statusCode: HttpStatus.OK,
  //       messageCode: 'CLASS_ACTIVITIES_UPDATED_SUCCESSFULLY',
  //     })
  //   }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hoạt động lớp học' })
  async deleteClassActivities(@Param('id') id: number): Promise<ResponseDto> {
    await this.classActivitiesService.deleteClassActivities(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('Teacher Class Activities')
@ApiBearerAuth()
@Auth(Role.TEACHER)
@Controller('teacher/class-activities')
export class TeacherClassActivitiesController {
  constructor(private readonly classActivitiesService: ClassActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hoạt động lớp học' })
  async createClassActivities(@Body() createClassActivitiesDto: CreateClassActivitiesDto): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.createClassActivities(createClassActivitiesDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CLASS_ACTIVITIES_CREATED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hoạt động lớp học theo ID' })
  async getClassActivitiesById(@Param('id') id: number): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivitiesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả hoạt động lớp học' })
  async getClassActivities(@Query() paginateClassActivitiesDto: PaginateClassActivitiesDto): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivities(paginateClassActivitiesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hoạt động lớp học' })
  async updateClassActivities(@Param('id') id: number, @Body() updateClassActivitiesDto: UpdateClassActivitiesDto): Promise<ResponseDto> {
    await this.classActivitiesService.updateClassActivities(id, updateClassActivitiesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hoạt động lớp học' })
  async deleteClassActivities(@Param('id') id: number): Promise<ResponseDto> {
    await this.classActivitiesService.deleteClassActivities(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('Student Class Activities')
@ApiBearerAuth()
@Auth(Role.STUDENT)
@Controller('student/class-activities')
export class StudentClassActivitiesController {
  constructor(private readonly classActivitiesService: ClassActivitiesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hoạt động lớp học theo ID' })
  async getClassActivitiesById(@Param('id') id: number): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivitiesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả hoạt động lớp học' })
  async getClassActivities(@Query() paginateClassActivitiesDto: PaginateClassActivitiesDto): Promise<ResponseDto> {
    const classActivities = await this.classActivitiesService.getClassActivities(paginateClassActivitiesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CLASS_ACTIVITIES_FETCHED_SUCCESSFULLY',
      data: classActivities,
    })
  }
}
