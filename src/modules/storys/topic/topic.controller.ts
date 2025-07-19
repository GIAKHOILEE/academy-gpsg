import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'

import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateTopicDto } from './dtos/create-topic.dto'
import { PaginateTopicDto } from './dtos/paginate-topic.dto'
import { UpdateTopicDto } from './dtos/update-topic.dto'
import { TopicService } from './topic.service'

@ApiTags('Admin Topics')
@Controller('admin/topics')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminTopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new topic' })
  async createTopic(@Body() createTopicDto: CreateTopicDto): Promise<ResponseDto> {
    const topic = await this.topicService.createTopic(createTopicDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'TOPIC_CREATED',
      data: topic,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all topics' })
  async getTopics(@Query() paginateTopicDto: PaginateTopicDto): Promise<ResponseDto> {
    const topics = await this.topicService.getTopics(paginateTopicDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPICS_FETCHED',
      data: topics.data,
      meta: topics.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by id' })
  @ApiParam({ name: 'id', type: Number })
  async getTopicById(@Param('id') id: number): Promise<ResponseDto> {
    const topic = await this.topicService.getTopicById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPIC_FETCHED',
      data: topic,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a topic by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateTopic(@Param('id') id: number, @Body() updateTopicDto: UpdateTopicDto): Promise<ResponseDto> {
    await this.topicService.updateTopic(id, updateTopicDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPIC_UPDATED',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a topic by id' })
  @ApiParam({ name: 'id', type: Number })
  async deleteTopic(@Param('id') id: number): Promise<ResponseDto> {
    await this.topicService.deleteTopics(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPIC_DELETED',
    })
  }
}

@ApiTags('Topics')
@Controller('topics')
export class UserTopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  @ApiOperation({ summary: 'Get all topics' })
  async getTopics(@Query() paginateTopicDto: PaginateTopicDto): Promise<ResponseDto> {
    const topics = await this.topicService.getTopics(paginateTopicDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPICS_FETCHED',
      data: topics.data,
      meta: topics.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by id' })
  @ApiParam({ name: 'id', type: Number })
  async getTopicById(@Param('id') id: number): Promise<ResponseDto> {
    const topic = await this.topicService.getTopicById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'TOPIC_FETCHED',
      data: topic,
    })
  }
}
