import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CreatePostDto } from './dtos/create-post.dto'
import { PaginatePostDto } from './dtos/paginate-post.dto'
import { UpdatePostDto } from './dtos/update-post.dto'
import { PostService } from './post.service'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PostStatus } from '@enums/post.enum'

/*===============================================
  ======================ADMIN=====================
  ===============================================*/
@Controller('admin/post-top')
@Auth(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
@ApiTags('Admin post-top')
export class PostTopControllerAdmin {
  constructor(private readonly postService: PostService) {}
  // ========================== TOP ==========================
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async createTopPost(@Body() createPostDto: CreatePostDto): Promise<ResponseDto> {
    const post = await this.postService.create(createPostDto, PostStatus.TOP)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_POST_SUCCESS',
      data: post,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all top posts' })
  async getAllTopPosts(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, true, PostStatus.TOP)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_TOP_POSTS_SUCCESS',
      data: posts.data,
      meta: posts.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a top post by id' })
  async getTopPostById(@Param('id') id: string): Promise<ResponseDto> {
    const post = await this.postService.getPostById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_TOP_POST_BY_ID_SUCCESS',
      data: post,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a top post by id' })
  async updateTopPostById(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto): Promise<ResponseDto> {
    await this.postService.update(Number(id), updatePostDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_TOP_POST_SUCCESS',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a top post by id' })
  async deleteTopPostById(@Param('id') id: string): Promise<ResponseDto> {
    await this.postService.delete(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_TOP_POST_SUCCESS',
    })
  }

  @Put('is-active/:id')
  @ApiOperation({ summary: 'Update is active of top post' })
  async updateTopPostIsActive(@Param('id') id: string): Promise<ResponseDto> {
    await this.postService.updateIsActive(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_TOP_POST_IS_ACTIVE_SUCCESS',
    })
  }

  @Put('is-banner/:id')
  @ApiOperation({ summary: 'Update is banner of top post' })
  async updateTopPostIsBanner(@Param('id') id: string): Promise<ResponseDto> {
    await this.postService.updateIsBanner(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_TOP_POST_IS_BANNER_SUCCESS',
    })
  }
}

/*===============================================
  ======================USER=====================
  ===============================================*/
@Controller('post-top')
@ApiTags('User post-top')
export class PostTopControllerUser {
  constructor(private readonly postService: PostService) {}
  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  async getAllPostsByUser(@Query() query: PaginatePostDto): Promise<ResponseDto> {
    const posts = await this.postService.getManyPost(query, false, PostStatus.TOP)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_POSTS_SUCCESS',
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
