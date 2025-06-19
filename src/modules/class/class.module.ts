import { Module } from '@nestjs/common'
import { ClassService } from './class.service'
import { AdminClassController, UserClassController } from './class.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from './class.entity'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Department } from '@modules/departments/departments.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Classes, Subject, Teacher, Department])],
  controllers: [AdminClassController, UserClassController],
  providers: [ClassService],
})
export class ClassModule {}
