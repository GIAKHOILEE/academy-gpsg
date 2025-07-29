import { Module } from '@nestjs/common'
import { ClassService } from './class.service'
import { AdminClassController, StudentClassController, UserClassController } from './class.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from './class.entity'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Semester } from './_semester/semester.entity'
import { Scholastic } from './_scholastic/scholastic.entity'
import { ClassStudents } from './class-students/class-student.entity'
import { Student } from '@modules/students/students.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Classes, Subject, Teacher, Semester, Scholastic, ClassStudents, Student])],
  controllers: [AdminClassController, UserClassController, StudentClassController],
  providers: [ClassService],
})
export class ClassModule {}
