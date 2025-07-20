import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common'
import { NavigationParentService } from './navigation-parent.service'
import { CreateNavigationDto, FilterNavigationDto } from '../dtos/navigation.dto'
import { UpdateNavigationDto } from '../dtos/navigation.dto'
import { ResponseDto } from 'src/common/response.dto'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
/*=======================================================
  ======================ADMIN============================
  ========================================================*/
@Controller('admin/navigation')
@Auth(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
@ApiTags('Admin Navigation')
export class NavigationParentController {
  constructor(private readonly navigationService: NavigationParentService) {}

  @Post()
  async create(@Body() createNavigationDto: CreateNavigationDto): Promise<ResponseDto> {
    const navigation = await this.navigationService.create(createNavigationDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Get()
  async findAll(@Query() filterNavigationDto: FilterNavigationDto): Promise<ResponseDto> {
    const navigation = await this.navigationService.findAll(filterNavigationDto, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const navigation = await this.navigationService.findOne(+id, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateNavigationDto: UpdateNavigationDto): Promise<ResponseDto> {
    const navigation = await this.navigationService.update(+id, updateNavigationDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Put('/index/:id')
  async updateIndex(@Param('id') id: string, @Query('index') index: number): Promise<ResponseDto> {
    const navigation = await this.navigationService.updateIndex(+id, index)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_INDEX_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Put('/active/:id')
  async updateActive(@Param('id') id: string): Promise<ResponseDto> {
    await this.navigationService.updateActive(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_IS_ACTIVE_NAVIGATION_SUCCESS',
    })
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ResponseDto> {
    await this.navigationService.remove(+id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_NAVIGATION_SUCCESS',
    })
  }
}

/*=======================================================
  ======================USER============================
  ========================================================*/
@Controller('navigation')
@ApiTags('User Navigation')
export class NavigationParentControllerUser {
  constructor(private readonly navigationService: NavigationParentService) {}

  @Get()
  async findAll(@Query() filterNavigationDto: FilterNavigationDto): Promise<ResponseDto> {
    const navigation = await this.navigationService.findAll(filterNavigationDto, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto> {
    const navigation = await this.navigationService.findOne(+id, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_NAVIGATION_SUCCESS',
      data: navigation,
    })
  }
}
