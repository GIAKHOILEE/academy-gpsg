import { Module } from '@nestjs/common'
import { AdminDiscussController, UserDiscussController } from './discuss.controller'
import { DiscussService } from './discuss.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Discuss } from './discuss.entity'
import { Lesson } from '../lesson/lesson.entity'
import { User } from '@modules/users/user.entity'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [TypeOrmModule.forFeature([Discuss, Lesson, User]), HttpModule],
  controllers: [AdminDiscussController, UserDiscussController],
  providers: [DiscussService, BrevoMailerService],
})
export class DiscussModule {}
