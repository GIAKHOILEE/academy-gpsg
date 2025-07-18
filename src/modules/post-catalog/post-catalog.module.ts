import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostCatalog } from './post-catalog.entity'
import { PostCatalogAdminController, PostCatalogController } from './post-catalog.controller'
import { PostCatalogService } from './post-catalog.service'

@Module({
  imports: [TypeOrmModule.forFeature([PostCatalog])],
  controllers: [PostCatalogAdminController, PostCatalogController],
  providers: [PostCatalogService],
})
export class PostCatalogModule {}
