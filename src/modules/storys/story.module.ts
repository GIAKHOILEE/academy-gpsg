import { Module } from '@nestjs/common'
import { AdminTopicController, UserTopicController } from './topic/topic.controller'
import { AdminStoryController, UserStoryController } from './story/story.controller'
import { StoryService } from './story/story.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Story } from './story/story.entity'
import { Topic } from './topic/topic.entity'
import { TopicService } from './topic/topic.service'

@Module({
  imports: [TypeOrmModule.forFeature([Story, Topic])],
  controllers: [AdminTopicController, UserTopicController, AdminStoryController, UserStoryController],
  providers: [StoryService, TopicService],
})
export class StoryModule {}
