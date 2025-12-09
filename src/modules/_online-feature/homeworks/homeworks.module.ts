import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Homeworks } from './entities/homeworks.entity'
import { HomeworkQuestion } from './entities/question.entity'
import { HomeworkOption } from './entities/option.entity'
import { HomeworkSubmission } from './entities/submission.entity'
import { HomeworkAnswer } from './entities/answer.entity'
import { HomeworkService } from './homeworks.service'
import { AdminHomeworkController, TeacherHomeworkController } from './homeworks.controller'
import { Lesson } from '../lesson/lesson.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Homeworks, HomeworkQuestion, HomeworkOption, HomeworkSubmission, HomeworkAnswer, Lesson])],
  controllers: [AdminHomeworkController, TeacherHomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
