import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { BannerService } from './banner.service'
import { CreateBannerDto } from './dtos/create-banner.dto'
import { PaginateBannerDto } from './dtos/paginate-banner.dto'
import { UpdateBannerDto } from './dtos/update-banner.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

/*===============================================
  ======================ADMIN=====================
=================================================*/
@Controller('admin/banner')
@ApiBearerAuth()
@ApiTags('Admin banner')
@Auth(Role.ADMIN, Role.STAFF)
export class BannerAdminController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  async createBanner(@Body() createBannerDto: CreateBannerDto): Promise<ResponseDto> {
    const banner = await this.bannerService.createBanner(createBannerDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_BANNER_SUCCESS',
      data: banner,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  async getAllBanners(@Query() query: PaginateBannerDto): Promise<ResponseDto> {
    const banners = await this.bannerService.getManyBanner(query, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_BANNERS_SUCCESS',
      data: banners.data,
      meta: banners.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to get' })
  async getBannerById(@Param('id') id: string): Promise<ResponseDto> {
    const banner = await this.bannerService.getBannerById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_BANNER_BY_ID_SUCCESS',
      data: banner,
    })
  }

  @Put('is-active/:id')
  @ApiOperation({ summary: 'Update is active of banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to update' })
  async updateIsActive(@Param('id') id: string): Promise<ResponseDto> {
    await this.bannerService.updateIsActive(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_IS_ACTIVE_BANNER_SUCCESS',
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index of banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to update' })
  async updateIndex(@Param('id') id: string, @Query('index') index: number): Promise<ResponseDto> {
    await this.bannerService.updateIndex(Number(id), index)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_INDEX_BANNER_SUCCESS',
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to update' })
  async updateBannerById(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto): Promise<ResponseDto> {
    const banner = await this.bannerService.updateBanner(Number(id), updateBannerDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_BANNER_BY_ID_SUCCESS',
      data: banner,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to delete' })
  async deleteBanner(@Param('id') id: number): Promise<ResponseDto> {
    await this.bannerService.deleteBanner(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_BANNER_SUCCESS',
    })
  }
}

/*===============================================
  ======================USER=====================
=================================================*/
@Controller('banner')
@ApiTags('Banner')
export class BannerUserController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  async getAllBanners(@Query() query: PaginateBannerDto): Promise<ResponseDto> {
    const banners = await this.bannerService.getManyBanner(query, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_BANNERS_SUCCESS',
      data: banners.data,
      meta: banners.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the banner to get' })
  async getBannerById(@Param('id') id: number): Promise<ResponseDto> {
    const banner = await this.bannerService.getBannerById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_BANNER_BY_ID_SUCCESS',
      data: banner,
    })
  }
}
