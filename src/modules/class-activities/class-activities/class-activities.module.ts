import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminClassActivitiesController } from './class-activities.controller'
import { TeacherClassActivitiesController } from './class-activities.controller'
import { StudentClassActivitiesController } from './class-activities.controller'
import { Teacher } from '@modules/teachers/teachers.entity'
import { ClassActivitiesEntity } from './class-activities.entity'
import { ClassActivitiesService } from './class-activities.service'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'
import { CommentEntity } from '../comment/comment.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ClassActivitiesEntity, Classes, Teacher, Student, CommentEntity])],
  controllers: [AdminClassActivitiesController, TeacherClassActivitiesController, StudentClassActivitiesController],
  providers: [ClassActivitiesService],
  exports: [ClassActivitiesService],
})
export class ClassActivitiesModule {}
