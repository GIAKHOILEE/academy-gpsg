import { Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { WitnessFaithService } from './witness-faith.service'
import { CreateWitnessFaithDto } from './dtos/create-witness-faith.dto'
import { Body } from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { ApiOperation } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { PaginateWitnessFaithDto } from './dtos/paginate-witness-faith.dto'
import { WitnessFaithMenuService } from './_witness-faith-menu/witness-faith-menu.service'
import { CreateWitnessFaithMenuDto } from './_witness-faith-menu/dtos/create-witness-faith-menu.dto'
import { PaginateWitnessFaithMenuDto } from './_witness-faith-menu/dtos/paginate-witness-faith-menu.dto'
import { UpdateWitnessFaithMenuDto } from './_witness-faith-menu/dtos/update-witness-faith-menu.dto'
import { UpdateWitnessFaithDto } from './dtos/update-witness-faith.dto'

@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/witness-faiths')
@ApiTags('Admin Witness Faiths')
export class WitnessFaithController {
  constructor(private readonly witnessFaithService: WitnessFaithService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo chứng nhân đức tin' })
  async createWitnessFaith(@Body() createWitnessFaithDto: CreateWitnessFaithDto): Promise<ResponseDto> {
    const data = await this.witnessFaithService.createWitnessFaith(createWitnessFaithDto)
    return {
      statusCode: 201,
      messageCode: 'WITNESS_FAITH_CREATE_SUCCESS',
      data,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chứng nhân đức tin' })
  async getWitnessFaiths(@Query() paginateWitnessFaithDto: PaginateWitnessFaithDto): Promise<ResponseDto> {
    const data = await this.witnessFaithService.getAllWitnessFaiths(paginateWitnessFaithDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_GET_SUCCESS',
      data,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chứng nhân đức tin theo id' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của chứng nhân đức tin' })
  async getWitnessFaithById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.witnessFaithService.getWitnessFaithById(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_GET_BY_ID_SUCCESS',
      data,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật chứng nhân đức tin' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của chứng nhân đức tin' })
  async updateWitnessFaith(@Param('id') id: number, @Body() updateWitnessFaithDto: UpdateWitnessFaithDto): Promise<ResponseDto> {
    const data = await this.witnessFaithService.updateWitnessFaith(id, updateWitnessFaithDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_UPDATE_SUCCESS',
      data,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng nhân đức tin' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của chứng nhân đức tin' })
  async deleteWitnessFaith(@Param('id') id: number): Promise<ResponseDto> {
    await this.witnessFaithService.deleteWitnessFaith(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_DELETE_SUCCESS',
    }
  }
}

@Controller('witness-faiths')
@ApiTags('Witness Faiths')
export class WitnessFaithPublicController {
  constructor(private readonly witnessFaithService: WitnessFaithService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chứng nhân đức tin' })
  async getWitnessFaiths(@Query() paginateWitnessFaithDto: PaginateWitnessFaithDto): Promise<ResponseDto> {
    const data = await this.witnessFaithService.getAllWitnessFaiths(paginateWitnessFaithDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_GET_SUCCESS',
      data,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chứng nhân đức tin theo id' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của chứng nhân đức tin' })
  async getWitnessFaithById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.witnessFaithService.getWitnessFaithById(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_GET_BY_ID_SUCCESS',
      data,
    }
  }
}

@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/witness-faith/menus')
@ApiTags('Admin Witness Faith Menus')
export class WitnessFaithMenuController {
  constructor(private readonly witnessFaithMenuService: WitnessFaithMenuService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo menu chứng nhân đức tin' })
  async createWitnessFaithMenu(@Body() createWitnessFaithMenuDto: CreateWitnessFaithMenuDto): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.createWitnessFaithMenu(createWitnessFaithMenuDto)
    return {
      statusCode: 201,
      messageCode: 'WITNESS_FAITH_MENU_CREATE_SUCCESS',
      data,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách menu chứng nhân đức tin' })
  async getWitnessFaithMenus(@Query() paginateWitnessFaithMenuDto: PaginateWitnessFaithMenuDto): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.getWitnessFaithMenus(paginateWitnessFaithMenuDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_GET_SUCCESS',
      data,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy menu chứng nhân đức tin theo id' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của menu chứng nhân đức tin' })
  async getWitnessFaithMenuById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.getDetailWitnessFaithMenu(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_GET_BY_ID_SUCCESS',
      data,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật menu chứng nhân đức tin' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của menu chứng nhân đức tin' })
  async updateWitnessFaithMenu(@Param('id') id: number, @Body() updateWitnessFaithMenuDto: UpdateWitnessFaithMenuDto): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.updateWitnessFaithMenu(id, updateWitnessFaithMenuDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_UPDATE_SUCCESS',
      data,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa menu chứng nhân đức tin' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của menu chứng nhân đức tin' })
  async deleteWitnessFaithMenu(@Param('id') id: number): Promise<ResponseDto> {
    await this.witnessFaithMenuService.deleteWitnessFaithMenu(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_DELETE_SUCCESS',
    }
  }
}

@Controller('witness-faith/menus')
@ApiTags('Witness Faith Menus')
export class WitnessFaithMenuPublicController {
  constructor(private readonly witnessFaithMenuService: WitnessFaithMenuService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách menu chứng nhân đức tin' })
  async getWitnessFaithMenus(@Query() paginateWitnessFaithMenuDto: PaginateWitnessFaithMenuDto): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.getWitnessFaithMenus(paginateWitnessFaithMenuDto)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_GET_SUCCESS',
      data,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy menu chứng nhân đức tin theo id' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của menu chứng nhân đức tin' })
  async getWitnessFaithMenuById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.witnessFaithMenuService.getDetailWitnessFaithMenu(id)
    return {
      statusCode: 200,
      messageCode: 'WITNESS_FAITH_MENU_GET_BY_ID_SUCCESS',
      data,
    }
  }
}
