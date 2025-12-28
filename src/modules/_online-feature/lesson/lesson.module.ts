import { Module } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { AdminLessonController, TeacherLessonController, UserLessonController } from './lesson.controller'
import { Lesson } from './lesson.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'
import { User } from '@modules/users/user.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Classes, User, Student, ClassStudents])],
  controllers: [AdminLessonController, TeacherLessonController, UserLessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
