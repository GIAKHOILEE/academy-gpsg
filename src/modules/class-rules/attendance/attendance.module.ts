import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Attendance } from './attendance.entity'
import { AttendanceController, TeacherAttendanceController, UserAttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { AttendanceRule } from '../attendance-rule/attendance-rule.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, AttendanceRule, Classes, Student, ClassStudents])],
  controllers: [AttendanceController, UserAttendanceController, TeacherAttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
