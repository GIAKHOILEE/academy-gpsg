import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Banner } from './banners.entity'
import { BannersService } from './banners.service'

import { AdminBannersController, UserBannersController } from './banners.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  providers: [BannersService],
  controllers: [AdminBannersController, UserBannersController],
  exports: [BannersService],
})
export class BannersModule {}
