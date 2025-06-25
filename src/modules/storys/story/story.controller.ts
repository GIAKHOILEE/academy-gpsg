import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateStoryDto } from './dtos/create-story.dto'
import { PaginateStoryDto } from './dtos/paginate-story.dto'
import { UpdateStoryDto } from './dtos/update-story.dto'
import { StoryService } from './story.service'

@ApiTags('Admin Stories')
@Controller('admin/stories')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminStoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story' })
  async createStory(@Body() createStoryDto: CreateStoryDto): Promise<ResponseDto> {
    const story = await this.storyService.createStory(createStoryDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'STORY_CREATED',
      data: story,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all stories' })
  async getStories(@Query() paginateStoryDto: PaginateStoryDto): Promise<ResponseDto> {
    const stories = await this.storyService.getStories(paginateStoryDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORIES_FETCHED',
      data: stories.data,
      meta: stories.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a story by id' })
  @ApiParam({ name: 'id', type: Number })
  async getStoryById(@Param('id') id: number): Promise<ResponseDto> {
    const story = await this.storyService.getStoryById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORY_FETCHED',
      data: story,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a story by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateStory(@Param('id') id: number, @Body() updateStoryDto: UpdateStoryDto): Promise<ResponseDto> {
    await this.storyService.updateStory(id, updateStoryDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORY_UPDATED',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a story by id' })
  @ApiParam({ name: 'id', type: Number })
  async deleteStory(@Param('id') id: number): Promise<ResponseDto> {
    await this.storyService.deleteStory(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORY_DELETED',
    })
  }
}

@ApiTags('Stories')
@Controller('stories')
export class UserStoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stories' })
  async getStories(@Query() paginateStoryDto: PaginateStoryDto): Promise<ResponseDto> {
    const stories = await this.storyService.getStories(paginateStoryDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORIES_FETCHED',
      data: stories.data,
      meta: stories.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a story by id' })
  @ApiParam({ name: 'id', type: Number })
  async getStoryById(@Param('id') id: number): Promise<ResponseDto> {
    const story = await this.storyService.getStoryById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORY_FETCHED',
      data: story,
    })
  }
}
