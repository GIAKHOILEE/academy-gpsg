import { Module } from '@nestjs/common'
import { AdminDiscussController, UserDiscussController } from './discuss.controller'
import { DiscussService } from './discuss.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Discuss } from './discuss.entity'
import { Lesson } from '../lesson/lesson.entity'
import { User } from '@modules/users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Discuss, Lesson, User])],
  controllers: [AdminDiscussController, UserDiscussController],
  providers: [DiscussService],
})
export class DiscussModule {}
