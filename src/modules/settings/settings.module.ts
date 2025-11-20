import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Settings } from './settings.entity'
import { SettingsControllerAdmin } from './settings.controller'
import { SettingsService } from './settings.service'
import { UserSettingsController } from './settings.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  controllers: [SettingsControllerAdmin, UserSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
