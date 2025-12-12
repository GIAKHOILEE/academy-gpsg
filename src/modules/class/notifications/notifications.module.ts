import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminNotificationsOnlineController, UserNotificationsOnlineController } from './notifications.controller'
import { ClassNotification } from './notifications.entity'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [TypeOrmModule.forFeature([ClassNotification])],
  providers: [NotificationsService],
  controllers: [AdminNotificationsOnlineController, UserNotificationsOnlineController],
})
export class ClassNotificationsModule {}
