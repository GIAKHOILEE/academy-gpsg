import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { paginate, PaginationMeta } from '@common/pagination'
import { formatStringDate, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Topic } from '../topic/topic.entity'
import { CreateStoryDto } from './dtos/create-story.dto'
import { PaginateStoryDto } from './dtos/paginate-story.dto'
import { UpdateStoryDto } from './dtos/update-story.dto'
import { Story } from './story.entity'
import { IStory } from './story.interface'

@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(Story)
    private storyRepository: Repository<Story>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
  ) {}

  async createStory(createStoryDto: CreateStoryDto): Promise<IStory> {
    const topic = await this.topicRepository.findOne({ where: { id: createStoryDto.topic_id } })
    if (!topic) throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    const story = this.storyRepository.create(createStoryDto)
    const savedStory = await this.storyRepository.save(story)

    const formattedStory: IStory = {
      id: savedStory.id,
      title: savedStory.title,
      thumbnail: savedStory.thumbnail,
      content: savedStory.content,
      topic_id: savedStory.topic_id,
      topic: topic,
      created_at: formatStringDate(savedStory.created_at.toISOString()),
    }

    return formattedStory
  }

  async updateStory(id: number, updateStoryDto: UpdateStoryDto): Promise<void> {
    const existsStory = await this.storyRepository.exists({ where: { id } })
    if (!existsStory) throwAppException('STORY_NOT_FOUND', ErrorCode.STORY_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (updateStoryDto.topic_id) {
      const existsTopic = await this.topicRepository.exists({ where: { id: updateStoryDto.topic_id } })
      if (!existsTopic) throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)

      await this.storyRepository.update(id, { ...updateStoryDto, topic_id: updateStoryDto.topic_id })
    } else {
      await this.storyRepository.update(id, updateStoryDto)
    }
  }

  async deleteStory(id: number): Promise<void> {
    const existsStory = await this.storyRepository.exists({ where: { id } })
    if (!existsStory) throwAppException('STORY_NOT_FOUND', ErrorCode.STORY_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.storyRepository.delete(id)
  }

  async getStoryById(id: number): Promise<IStory> {
    const story = await this.storyRepository
      .createQueryBuilder('story')
      .leftJoinAndSelect('story.topic', 'topic')
      .where('story.id = :id', { id })
      .getOne()

    if (!story) throwAppException('STORY_NOT_FOUND', ErrorCode.STORY_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedStory: IStory = {
      id: story.id,
      title: story.title,
      thumbnail: story.thumbnail,
      content: story.content,
      topic_id: story.topic_id,
      topic: story.topic,
      created_at: formatStringDate(story.created_at.toISOString()),
    }

    return formattedStory
  }

  async getStories(paginateStoryDto: PaginateStoryDto): Promise<{ data: IStory[]; meta: PaginationMeta }> {
    const { topic_id, ...rest } = paginateStoryDto
    const query = this.storyRepository
      .createQueryBuilder('story')
      .leftJoinAndSelect('story.topic', 'topic')
      .select(['story.id', 'story.title', 'story.thumbnail', 'story.content', 'story.topic_id', 'story.created_at', 'topic.id', 'topic.name'])

    if (topic_id) {
      query.where('story.topic_id = :topic_id', { topic_id })
    }

    if (!rest.title && !topic_id) {
      // random order nếu không có filter
      query.orderBy('RAND()')
    }

    const { data, meta } = await paginate(query, rest)

    const formattedStories: IStory[] = data.map(story => ({
      id: story.id,
      title: story.title,
      thumbnail: story.thumbnail,
      content: story.content,
      topic_id: story.topic_id,
      created_at: formatStringDate(story.created_at.toISOString()),
      topic: {
        id: story.topic.id,
        name: story.topic.name,
      },
    }))

    return {
      data: formattedStories,
      meta,
    }
  }
}
