import { Module } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { AdminLessonController, UserLessonController } from './lesson.controller'
import { Lesson } from './lesson.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Classes])],
  controllers: [AdminLessonController, UserLessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
