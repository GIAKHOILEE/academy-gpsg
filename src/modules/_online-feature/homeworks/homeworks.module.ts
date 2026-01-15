import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Homeworks } from './entities/homeworks.entity'
import { HomeworkQuestion } from './entities/question.entity'
import { HomeworkOption } from './entities/option.entity'
import { HomeworkSubmission } from './entities/submission.entity'
import { HomeworkAnswer } from './entities/answer.entity'
import { HomeworkService } from './homeworks.service'
import {
  AdminHomeworkController,
  AdminHomeworkSubmissionController,
  StudentHomeworkController,
  TeacherHomeworkController,
  StudentHomeworkSubmissionController,
  TeacherHomeworkSubmissionController,
} from './homeworks.controller'
import { Lesson } from '../lesson/lesson.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Homeworks, HomeworkQuestion, HomeworkOption, HomeworkSubmission, HomeworkAnswer, Lesson, Student, ClassStudents]),
  ],
  controllers: [
    AdminHomeworkSubmissionController,
    TeacherHomeworkSubmissionController,
    StudentHomeworkSubmissionController,
    AdminHomeworkController,
    TeacherHomeworkController,
    StudentHomeworkController,
  ],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
