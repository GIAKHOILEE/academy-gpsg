import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common'
import { NavigationSubService } from './navigation-sub.service'
import { CreateSubNavigationDto, FilterSubNavigationDto, UpdateSubNavigationDto } from '../dtos/sub-navigation.dto'
import { ResponseDto } from 'src/common/response.dto'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

/*=======================================================
  ================== ADMIN ==================
  ========================================================*/
@Controller('admin/sub-navigations')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@ApiTags('Admin Sub Navigations')
export class NavigationSubController {
  constructor(private readonly subNavigationService: NavigationSubService) {}

  @Post()
  async create(@Body() createSubNavigationDto: CreateSubNavigationDto): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.create(createSubNavigationDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_SUB_NAVIGATION_SUCCESS',
      data: subNavigation,
    })
  }

  @Get()
  async findAll(@Query() filterSubNavigationDto: FilterSubNavigationDto): Promise<ResponseDto> {
    const subNavigations = await this.subNavigationService.findAll(filterSubNavigationDto, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATIONS_SUCCESS',
      data: subNavigations,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.findOne(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATION_SUCCESS',
      data: subNavigation,
    })
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSubNavigationDto: UpdateSubNavigationDto): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.update(+id, updateSubNavigationDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_SUCCESS',
      data: subNavigation,
    })
  }

  @Put('/index/:id')
  async updateIndex(@Param('id') id: string, @Query('index') index: number): Promise<ResponseDto> {
    await this.subNavigationService.updateIndex(+id, index)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_SUCCESS',
    })
  }

  @Put('/active/:id')
  async updateActive(@Param('id') id: string): Promise<ResponseDto> {
    await this.subNavigationService.updateActive(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_SUB_NAVIGATION_SUCCESS',
    })
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto> {
    await this.subNavigationService.remove(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_SUB_NAVIGATION_SUCCESS',
    })
  }
}

/*=======================================================
  ================== USER ==================
  ========================================================*/
@Controller('sub-navigations')
@ApiTags('User Sub Navigations')
export class NavigationSubControllerUser {
  constructor(private readonly subNavigationService: NavigationSubService) {}

  @Get()
  async findAll(@Query() filterSubNavigationDto: FilterSubNavigationDto): Promise<ResponseDto> {
    const subNavigations = await this.subNavigationService.findAll(filterSubNavigationDto, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATIONS_SUCCESS',
      data: subNavigations,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const subNavigation = await this.subNavigationService.findOne(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_SUB_NAVIGATION_SUCCESS',
      data: subNavigation,
    })
  }
}
