import { Module } from '@nestjs/common'
import { EnrollmentsService } from './enrollments.service'
import { EnrollmentsController, AdminEnrollmentsController } from './enrollments.controller'
import { Enrollments } from './enrollments.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { User } from '@modules/users/user.entity'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [TypeOrmModule.forFeature([Enrollments, Student, Classes, ClassStudents, User]), ScheduleModule.forRoot()],
  controllers: [AdminEnrollmentsController, EnrollmentsController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
