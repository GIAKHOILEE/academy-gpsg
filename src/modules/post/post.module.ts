import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostControllerAdmin } from './post.controller'
import { PostControllerUser } from './post.controller'
import { PostService } from './post.service'
import { Post } from './post.entity'
import { PostCatalog } from '../post-catalog/post-catalog.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostCatalog])],
  controllers: [PostControllerAdmin, PostControllerUser],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
