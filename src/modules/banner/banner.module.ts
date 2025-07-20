import { Module } from '@nestjs/common'
import { BannerService } from './banner.service'
import { BannerAdminController, BannerUserController } from './banner.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Banner } from './banner.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  controllers: [BannerAdminController, BannerUserController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
