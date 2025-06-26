import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Story } from '../story/story.entity'
import { CreateTopicDto } from './dtos/create-topic.dto'
import { PaginateTopicDto } from './dtos/paginate-topic.dto'
import { UpdateTopicDto } from './dtos/update-topic.dto'
import { Topic } from './topic.entity'
import { ITopic } from './topic.interface'

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(Story)
    private storyRepository: Repository<Story>,
  ) {}

  async createTopic(createTopicDto: CreateTopicDto): Promise<ITopic> {
    const existingTopic = await this.topicRepository.findOne({
      where: { name: createTopicDto.name },
    })

    if (existingTopic) throwAppException('TOPIC_ALREADY_EXISTS', ErrorCode.TOPIC_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    const topic = this.topicRepository.create(createTopicDto)

    return this.topicRepository.save(topic)
  }

  async updateTopic(id: number, updateTopicDto: UpdateTopicDto): Promise<void> {
    const existsTopic = await this.topicRepository.exists({ where: { id } })
    if (!existsTopic) throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (updateTopicDto.name) {
      const existingTopic = await this.topicRepository
        .createQueryBuilder('topic')
        .where('topic.name = :name', { name: updateTopicDto.name })
        .andWhere('topic.id != :id', { id })
        .getOne()
      if (existingTopic) throwAppException('TOPIC_ALREADY_EXISTS', ErrorCode.TOPIC_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    await this.topicRepository.update(id, updateTopicDto)
  }

  async getTopics(paginateTopicDto: PaginateTopicDto): Promise<{ data: ITopic[]; meta: PaginationMeta }> {
    const query = this.topicRepository.createQueryBuilder('topic')

    const { data, meta } = await paginate(query, paginateTopicDto)

    const topics: ITopic[] = data.map((topic: ITopic) => {
      return {
        id: topic.id,
        name: topic.name,
      }
    })

    return {
      data: topics,
      meta,
    }
  }

  async getTopicById(id: number): Promise<ITopic> {
    const topic = await this.topicRepository.findOne({ where: { id } })

    if (!topic) throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedTopic = {
      id: topic.id,
      name: topic.name,
      description: topic.description,
    }

    return formattedTopic
  }

  async deleteTopics(id: number): Promise<void> {
    const existsTopic = await this.topicRepository.exists({ where: { id } })
    if (!existsTopic) throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    const existsStory = await this.storyRepository.exists({ where: { topic_id: id } })
    if (existsStory) throwAppException('TOPIC_HAS_STORIES', ErrorCode.TOPIC_HAS_STORIES, HttpStatus.BAD_REQUEST)

    await this.topicRepository.delete(id)
  }
}
