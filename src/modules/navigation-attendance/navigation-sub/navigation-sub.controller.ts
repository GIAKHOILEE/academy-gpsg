import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common'
import { NavigationSubAttendanceService } from './navigation-sub.service'
import { CreateSubNavigationAttendanceDto, FilterSubNavigationAttendanceDto, UpdateSubNavigationAttendanceDto } from '../dtos/sub-navigation.dto'
import { ResponseDto } from 'src/common/response.dto'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

/*=======================================================
  ================== ADMIN ==================
  ========================================================*/
@Controller('admin/sub-navigations/attendance')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@ApiTags('Admin Sub Navigations Attendance')
export class NavigationSubControllerAttendance {
  constructor(private readonly subNavigationService: NavigationSubAttendanceService) {}

  @Post()
  async create(@Body() createSubNavigationDto: CreateSubNavigationAttendanceDto): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.create(createSubNavigationDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
      data: subNavigation,
    })
  }

  @Get()
  async findAll(@Query() filterSubNavigationDto: FilterSubNavigationAttendanceDto): Promise<ResponseDto> {
    const subNavigations = await this.subNavigationService.findAll(filterSubNavigationDto, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATIONS_ATTENDANCE_SUCCESS',
      data: subNavigations,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.findOne(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
      data: subNavigation,
    })
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSubNavigationDto: UpdateSubNavigationAttendanceDto): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.update(+id, updateSubNavigationDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
      data: subNavigation,
    })
  }

  @Put('/index/:id')
  async updateIndex(@Param('id') id: string, @Query('index') index: number): Promise<ResponseDto> {
    await this.subNavigationService.updateIndex(+id, index)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
    })
  }

  @Put('/active/:id')
  async updateActive(@Param('id') id: string): Promise<ResponseDto> {
    await this.subNavigationService.updateActive(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
    })
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto> {
    await this.subNavigationService.remove(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
    })
  }
}

/*=======================================================
  ================== USER ==================
  ========================================================*/
@Controller('sub-navigations/attendance')
@ApiTags('User Sub Navigations Attendance')
export class NavigationSubControllerAttendanceUser {
  constructor(private readonly subNavigationService: NavigationSubAttendanceService) {}

  @Get()
  async findAll(@Query() filterSubNavigationDto: FilterSubNavigationAttendanceDto): Promise<ResponseDto> {
    const subNavigations = await this.subNavigationService.findAll(filterSubNavigationDto, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATIONS_ATTENDANCE_SUCCESS',
      data: subNavigations,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.findOne(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATION_ATTENDANCE_SUCCESS',
      data: subNavigation,
    })
  }
}
