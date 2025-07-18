import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CreatePostCatalogDto } from './dtos/create-post-catalog.dto'
import { PaginatePostCatalogDto } from './dtos/paginate-post-catalog.dto'
import { PostCatalogService } from './post-catalog.service'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'

/*===========================================
==================ADMIN=====================
============================================ */
@Controller('admin/post-catalog')
@ApiTags('Admin post-catalog')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class PostCatalogAdminController {
  constructor(private readonly postCatalogService: PostCatalogService) {}

  @Post()
  @ApiOperation({ summary: 'Create post-catalog' })
  async create(@Body() createPostCatalogDto: CreatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.create(createPostCatalogDto)
    return new ResponseDto({
      messageCode: 'CREATE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all post-catalog' })
  async findAll(@Query() paginatePostCatalogDto: PaginatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findAll(paginatePostCatalogDto, true)
    return new ResponseDto({
      messageCode: 'GET_ALL_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post-catalog by id' })
  async getPostCatalogById(@Param('id') id: string): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findOne(+id)
    return new ResponseDto({
      messageCode: 'GET_POST_CATALOG_BY_ID_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update post-catalog by id' })
  async update(@Param('id') id: string, @Body() updatePostCatalogDto: CreatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.update(Number(id), updatePostCatalogDto)
    return new ResponseDto({
      messageCode: 'UPDATE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put('active/:id')
  @ApiOperation({ summary: 'Update active post-catalog by id' })
  async updateActive(@Param('id') id: string): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.updateActive(Number(id))
    return new ResponseDto({
      messageCode: 'UPDATE_ACTIVE_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index post-catalog by id' })
  async updateIndex(@Param('id') id: string, @Body() index: number): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.updateIndex(Number(id), index)
    return new ResponseDto({
      messageCode: 'UPDATE_INDEX_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Delete()
  @ApiOperation({ summary: 'Delete post-catalog' })
  async delete(@Param('id') id: string): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.remove(Number(id))
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
@Controller('post-catalog')
@ApiTags('User post-catalog')
export class PostCatalogController {
  constructor(private readonly postCatalogService: PostCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all post-catalog' })
  async findAll(@Query() paginatePostCatalogDto: PaginatePostCatalogDto): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findAllPostCatalogByUser(paginatePostCatalogDto)
    return new ResponseDto({
      messageCode: 'GET_ALL_POST_CATALOG_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post-catalog by id' })
  async getPostCatalogById(@Param('id') id: string): Promise<ResponseDto> {
    const postCatalog = await this.postCatalogService.findOne(+id)
    return new ResponseDto({
      messageCode: 'GET_POST_CATALOG_BY_ID_SUCCESS',
      statusCode: 200,
      data: postCatalog,
    })
  }
}
