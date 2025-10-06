import { Module } from '@nestjs/common'
import { CommentService } from './comment.service'
import { StudentCommentController } from './comment.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CommentEntity } from './comment.entity'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, ClassActivitiesEntity, Student, ClassStudents])],
  controllers: [StudentCommentController],
  providers: [CommentService],
})
export class StudentCommentModule {}
