import { Post } from '@modules/post/post.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostCatalogTopAdminController, PostCatalogTopControllerUser } from './post-catalog-top.controller'
import { PostCatalogAdminController, PostCatalogController } from './post-catalog.controller'
import { PostCatalog } from './post-catalog.entity'
import { PostCatalogService } from './post-catalog.service'

@Module({
  imports: [TypeOrmModule.forFeature([PostCatalog, Post])],
  controllers: [PostCatalogAdminController, PostCatalogController, PostCatalogTopAdminController, PostCatalogTopControllerUser],
  providers: [PostCatalogService],
})
export class PostCatalogModule {}
