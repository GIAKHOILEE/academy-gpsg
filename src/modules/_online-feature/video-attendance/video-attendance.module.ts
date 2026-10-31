import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Lesson } from '../lesson/lesson.entity'
import { LessonVideoProgress } from '../lesson/lesson-video-progress.entity'
import { ClassVideoAttendanceConfig } from './entities/class-video-attendance-config.entity'
import { VideoAttendanceQuestion } from './entities/video-attendance-question.entity'
import { AdminVideoAttendanceController, TeacherVideoAttendanceController } from './video-attendance.controller'
import { VideoAttendanceService } from './video-attendance.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassVideoAttendanceConfig,
      VideoAttendanceQuestion,
      LessonVideoProgress,
      Lesson,
      Classes,
      Student,
      ClassStudents,
      Attendance,
      Teacher,
    ]),
  ],
  controllers: [AdminVideoAttendanceController, TeacherVideoAttendanceController],
  providers: [VideoAttendanceService],
  exports: [VideoAttendanceService],
})
export class VideoAttendanceModule {}
