import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostControllerAdmin } from './post.controller'
import { PostControllerUser } from './post.controller'
import { PostService } from './post.service'
import { Post } from './post.entity'
import { PostCatalog } from '../post-catalog/post-catalog.entity'
import { PostTopControllerAdmin } from './post-top.controller'
import { PostTopControllerUser } from './post-top.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostCatalog])],
  controllers: [PostControllerAdmin, PostControllerUser, PostTopControllerAdmin, PostTopControllerUser],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
