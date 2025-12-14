import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminNotificationsOnlineController, UserNotificationsOnlineController } from './notifications.controller'
import { ClassNotification } from './notifications.entity'
import { NotificationsService } from './notifications.service'
import { Classes } from '../class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ClassNotification, Classes])],
  providers: [NotificationsService],
  controllers: [AdminNotificationsOnlineController, UserNotificationsOnlineController],
})
export class ClassNotificationsModule {}
