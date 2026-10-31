import { Module } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { AdminLessonController, TeacherLessonController, UserLessonController } from './lesson.controller'
import { Lesson } from './lesson.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'
import { User } from '@modules/users/user.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Discuss } from '../discuss/discuss.entity'
import { LessonVideoProgress } from './lesson-video-progress.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { AttendanceRule } from '@modules/class-rules/attendance-rule/attendance-rule.entity'
import { VideoAttendanceModule } from '../video-attendance/video-attendance.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, Classes, User, Student, ClassStudents, Discuss, LessonVideoProgress, Attendance, AttendanceRule]),
    VideoAttendanceModule,
  ],
  controllers: [AdminLessonController, TeacherLessonController, UserLessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
