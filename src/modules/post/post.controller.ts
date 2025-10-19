import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CreatePostDto } from './dtos/create-post.dto'
import { PaginatePostDto } from './dtos/paginate-post.dto'
import { UpdatePostDto } from './dtos/update-post.dto'
import { PostService } from './post.service'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PostCatalogType } from '@enums/post.enum'

/*===============================================
  ======================ADMIN=====================
  ===============================================*/
@Controller('admin/post')
@Auth(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
@ApiTags('Admin post')
export class PostControllerAdmin {
  constructor(private readonly postService: PostService) {}
  // ========================== BOTTOM ==========================

  @Post('kiot')
  @ApiOperation({ summary: 'Tạo bài viết kiot' })
  async createKiotPost(@Body() createKiotPostDto: CreatePostDto): Promise<ResponseDto> {
    const post = await this.postService.createKiotPost(createKiotPostDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_KIOT_POST_SUCCESS',
      data: post,
    })
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async create(@Body() createPostDto: CreatePostDto): Promise<ResponseDto> {
    const post = await this.postService.create(createPostDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_POST_SUCCESS',
      data: post,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  async getAllPosts(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, true, PostCatalogType.BOTTOM, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('top')
  @ApiOperation({ summary: 'Get all posts top' })
  async getAllPostsTop(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, true, PostCatalogType.TOP, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_TOP_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('private')
  @ApiOperation({ summary: 'Get all posts private' })
  async getAllPostsPrivate(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, true, null, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_PRIVATE_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('kiot')
  @ApiOperation({ summary: 'Get all kiot posts' })
  async getAllKiotPosts(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, true, null, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_KIOT_POSTS_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by id' })
  async getPostById(@Param('id') id: string): Promise<ResponseDto> {
    const post = await this.postService.getPostById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_POST_BY_ID_SUCCESS',
      data: post,
    })
  }

  @Put('is-active/:id')
  @ApiOperation({ summary: 'Update is active of post' })
  async updateIsActive(@Param('id') id: number): Promise<ResponseDto> {
    await this.postService.updateIsActive(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_IS_ACTIVE_POST_SUCCESS',
    })
  }

  @Put('is-banner/:id')
  @ApiOperation({ summary: 'Update is banner of post' })
  async updateIsBanner(@Param('id') id: number): Promise<ResponseDto> {
    await this.postService.updateIsBanner(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_IS_BANNER_POST_SUCCESS',
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index of post by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the post to update' })
  async updateIndex(@Param('id') id: string, @Query('index') index: number): Promise<ResponseDto> {
    await this.postService.updateIndex(Number(id), index)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_INDEX_POST_SUCCESS',
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post by id' })
  async updatePostById(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto): Promise<ResponseDto> {
    await this.postService.update(Number(id), updatePostDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_POST_SUCCESS',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post by id' })
  async deletePostById(@Param('id') id: string): Promise<ResponseDto> {
    await this.postService.delete(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_POST_SUCCESS',
    })
  }
}

/*===============================================
  ======================USER=====================
  ===============================================*/
@Controller('post')
@ApiTags('User post')
export class PostControllerUser {
  constructor(private readonly postService: PostService) {}
  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  async getAllPostsByUser(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, false, PostCatalogType.BOTTOM, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('top')
  @ApiOperation({ summary: 'Get all posts top' })
  async getAllPostsTopByUser(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, false, PostCatalogType.TOP, false)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_TOP_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('slice')
  @ApiOperation({ summary: 'Get all posts slice' })
  async getAllPostsSlice(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getPostSlice(query)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_SLICE_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get('kiot')
  @ApiOperation({ summary: 'Get all kiot posts' })
  async getAllKiotPostsByUser(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, false, null, true)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_KIOT_POSTS_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by id' })
  async getPostByIdByUser(@Param('id') id: string): Promise<ResponseDto> {
    const post = await this.postService.getPostById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_POST_BY_ID_SUCCESS',
      data: post,
    })
  }
}
