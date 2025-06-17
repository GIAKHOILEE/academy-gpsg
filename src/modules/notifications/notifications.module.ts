import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Notification } from './notifications.entity'
import { NotificationsService } from './notifications.service'
import { AdminNotificationsController, UserNotificationsController } from './notifications.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [AdminNotificationsController, UserNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
