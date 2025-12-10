import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Homeworks } from './entities/homeworks.entity'
import { HomeworkQuestion } from './entities/question.entity'
import { HomeworkOption } from './entities/option.entity'
import { HomeworkSubmission } from './entities/submission.entity'
import { HomeworkAnswer } from './entities/answer.entity'
import { HomeworkService } from './homeworks.service'
import { AdminHomeworkController, StudentHomeworkController, TeacherHomeworkController } from './homeworks.controller'
import { Lesson } from '../lesson/lesson.entity'
import { Student } from '@modules/students/students.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Homeworks, HomeworkQuestion, HomeworkOption, HomeworkSubmission, HomeworkAnswer, Lesson, Student])],
  controllers: [AdminHomeworkController, TeacherHomeworkController, StudentHomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
