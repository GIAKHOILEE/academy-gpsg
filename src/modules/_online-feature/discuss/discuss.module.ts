import { Module } from '@nestjs/common'
import { DiscussController } from './discuss.controller'
import { DiscussService } from './discuss.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Discuss } from './discuss.entity'
import { Lesson } from '../lesson/lesson.entity'
import { User } from '@modules/users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Discuss, Lesson, User])],
  controllers: [DiscussController],
  providers: [DiscussService],
})
export class DiscussModule {}
