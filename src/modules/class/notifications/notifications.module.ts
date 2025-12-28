import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  AdminNotificationsOnlineController,
  TeacherNotificationsOnlineController,
  UserNotificationsOnlineController,
} from './notifications.controller'
import { ClassNotification } from './notifications.entity'
import { NotificationsService } from './notifications.service'
import { Classes } from '../class.entity'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ClassNotification, Classes, Lesson])],
  providers: [NotificationsService],
  controllers: [AdminNotificationsOnlineController, TeacherNotificationsOnlineController, UserNotificationsOnlineController],
})
export class ClassNotificationsModule {}
