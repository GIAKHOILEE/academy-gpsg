import { Controller, Post, Body, Put, Get, HttpStatus, Delete, Param, Query } from '@nestjs/common'

import { BannersService } from './banners.service'
import { CreateBannerDto } from './dtos/create-banners.dto'
import { ResponseDto } from '@common/response.dto'
import { PaginateBannersDto } from './dtos/paginate-banners.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { UpdateBannerDto } from './dtos/update-banners.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

@ApiTags('Admin Banners')
@Controller('admin/banners')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  async createBanner(@Body() createBannerDto: CreateBannerDto): Promise<ResponseDto> {
    const banner = await this.bannersService.createBanner(createBannerDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'BANNER_CREATED_SUCCESSFULLY',
      data: banner,
    })
  }

  @Put(':id')
  async updateBanner(@Param('id') id: number, @Body() updateBannerDto: UpdateBannerDto): Promise<ResponseDto> {
    await this.bannersService.updateBanner(id, updateBannerDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNER_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  async deleteBanner(@Param('id') id: number): Promise<ResponseDto> {
    await this.bannersService.deleteBanner(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNER_DELETED_SUCCESSFULLY',
    })
  }

  @Get()
  async getBanners(@Query() paginateBannersDto: PaginateBannersDto): Promise<ResponseDto> {
    const { data, meta } = await this.bannersService.getBanners(paginateBannersDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNERS_FETCHED_SUCCESSFULLY',
      data: data,
      meta: meta,
    })
  }

  @Get(':id')
  async getBannerById(@Param('id') id: number): Promise<ResponseDto> {
    const banner = await this.bannersService.getBannerById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNER_FETCHED_SUCCESSFULLY',
      data: banner,
    })
  }
}

@ApiTags('User Banners')
@Controller('banners')
export class UserBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners(@Query() paginateBannersDto: PaginateBannersDto): Promise<ResponseDto> {
    const { data, meta } = await this.bannersService.getBanners(paginateBannersDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNERS_FETCHED_SUCCESSFULLY',
      data: data,
      meta: meta,
    })
  }

  @Get(':id')
  async getBannerById(@Param('id') id: number): Promise<ResponseDto> {
    const banner = await this.bannersService.getBannerById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'BANNER_FETCHED_SUCCESSFULLY',
      data: banner,
    })
  }
}
