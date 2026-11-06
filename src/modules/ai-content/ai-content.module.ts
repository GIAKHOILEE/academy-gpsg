import { PostCatalog } from '@modules/post-catalog/post-catalog.entity'
import { Post } from '@modules/post/post.entity'
import { Story } from '@modules/storys/story/story.entity'
import { Topic } from '@modules/storys/topic/topic.entity'
import { WitnessFaithMenu } from '@modules/witness-faiths/_witness-faith-menu/witness-faith-menu.entity'
import { WitnessFaith } from '@modules/witness-faiths/witness-faith.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CloudinaryModule } from '@services/cloudinary/cloudinary.module'
import { AiContentController } from './ai-content.controller'
import { AiContentService } from './ai-content.service'
import { AiContentBatch } from './entities/ai-content-batch.entity'
import { AiContentItem } from './entities/ai-content-item.entity'
import { GeminiAiService } from './gemini-ai.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([AiContentBatch, AiContentItem, Story, Topic, WitnessFaith, WitnessFaithMenu, Post, PostCatalog]),
    CloudinaryModule,
  ],
  controllers: [AiContentController],
  providers: [GeminiAiService, AiContentService],
  exports: [AiContentService, GeminiAiService],
})
export class AiContentModule {}

