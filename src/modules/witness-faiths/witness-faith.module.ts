import { Module } from '@nestjs/common'
import { WitnessFaithService } from './witness-faith.service'
import {
  WitnessFaithController,
  WitnessFaithMenuController,
  WitnessFaithMenuPublicController,
  WitnessFaithPublicController,
} from './witness-faith.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WitnessFaith } from './witness-faith.entity'
import { WitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.entity'
import { WitnessFaithMenuService } from './_witness-faith-menu/witness-faith-menu.service'

@Module({
  imports: [TypeOrmModule.forFeature([WitnessFaith, WitnessFaithMenu, WitnessFaithMenu])],
  controllers: [WitnessFaithMenuController, WitnessFaithMenuPublicController, WitnessFaithController, WitnessFaithPublicController],
  providers: [WitnessFaithService, WitnessFaithMenuService],
})
export class WitnessFaithModule {}
