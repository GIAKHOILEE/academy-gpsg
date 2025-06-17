import { Injectable, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

import { Story } from './story.entity'
import { IStory } from './story.interface'
import { CreateStoryDto } from './dtos/create-story.dto'
import { formatStringDate } from '@common/utils'
import { UpdateStoryDto } from './dtos/update-story.dto'
import { Topic } from '../topic/topic.entity'
import { PaginateStoryDto } from './dtos/paginate-story.dto'
import { paginate, PaginationMeta } from '@common/pagination'

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
    if (!topic) throw new NotFoundException('TOPIC_NOT_FOUND')

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
    if (!existsStory) throw new NotFoundException('STORY_NOT_FOUND')

    if (updateStoryDto.topic_id) {
      const existsTopic = await this.topicRepository.exists({ where: { id: updateStoryDto.topic_id } })
      if (!existsTopic) throw new NotFoundException('TOPIC_NOT_FOUND')

      await this.storyRepository.update(id, { ...updateStoryDto, topic_id: updateStoryDto.topic_id })
    } else {
      await this.storyRepository.update(id, updateStoryDto)
    }
  }

  async deleteStory(id: number): Promise<void> {
    const existsStory = await this.storyRepository.exists({ where: { id } })
    if (!existsStory) throw new NotFoundException('STORY_NOT_FOUND')

    await this.storyRepository.delete(id)
  }

  async getStoryById(id: number): Promise<IStory> {
    const story = await this.storyRepository
      .createQueryBuilder('story')
      .leftJoinAndSelect('story.topic', 'topic')
      .where('story.id = :id', { id })
      .getOne()

    if (!story) throw new NotFoundException('STORY_NOT_FOUND')

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
