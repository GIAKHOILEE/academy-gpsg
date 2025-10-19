import { Auth } from '@decorators/auth.decorator'
import { PostCatalogType } from '@enums/post.enum'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CreatePostCatalogDto } from './dtos/create-post-catalog.dto'
import { PaginatePostCatalogDto } from './dtos/paginate-post-catalog.dto'
import { UpdatePostCatalogDto } from './dtos/update-post-catalog.dto'
import { PostCatalogService } from './post-catalog.service'

/*===========================================
==================ADMIN=====================
============================================ */
@Controller('admin/post-catalog-top')
@ApiTags('Admin post-catalog-top')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class PostCatalogTopAdminController {
  constructor(private readonly postCatalogService: PostCatalogService) {}

  @Post()
  @ApiOperation({ summary: 'Create post-catalog' })
  async create(@Body() createPostCatalogDto: CreatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.create(createPostCatalogDto, PostCatalogType.TOP)
    return new ResponseDto({
      messageCode: 'CREATE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all post-catalog' })
  async findAll(@Query() paginatePostCatalogDto: PaginatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findAll(paginatePostCatalogDto, true, PostCatalogType.TOP)
    return new ResponseDto({
      messageCode: 'GET_ALL_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post-catalog by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async getPostCatalogById(@Param('id') id: number): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findOne(id)
    return new ResponseDto({
      messageCode: 'GET_POST_CATALOG_BY_ID_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update post-catalog by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async update(@Param('id') id: number, @Body() updatePostCatalogDto: UpdatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.update(id, updatePostCatalogDto)
    return new ResponseDto({
      messageCode: 'UPDATE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put('active/:id')
  @ApiOperation({ summary: 'Update active post-catalog by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async updateActive(@Param('id') id: number): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.updateActive(id)
    return new ResponseDto({
      messageCode: 'UPDATE_ACTIVE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index post-catalog by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async updateIndex(@Param('id') id: number, @Query('index') index: number): Promise<ResponseDto> {
    await this.postCatalogService.updateIndex(id, index)
    return new ResponseDto({
      messageCode: 'UPDATE_INDEX_POST_CATALOG_SUCCESS',
      statusCode: 200,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post-catalog' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async delete(@Param('id') id: number): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.remove(id)
    return new ResponseDto({
      messageCode: 'DELETE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }
}

/*===========================================   
==================USER=======================
============================================ */
@Controller('post-catalog-top')
@ApiTags('User post-catalog-top')
export class PostCatalogTopControllerUser {
  constructor(private readonly postCatalogService: PostCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all post-catalog' })
  async findAll(@Query() paginatePostCatalogDto: PaginatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findAllPostCatalogByUser(paginatePostCatalogDto, PostCatalogType.TOP)
    return new ResponseDto({
      messageCode: 'GET_ALL_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post-catalog by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Post catalog id' })
  async getPostCatalogById(@Param('id') id: number): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findOne(id)
    return new ResponseDto({
      messageCode: 'GET_POST_CATALOG_BY_ID_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }
}
