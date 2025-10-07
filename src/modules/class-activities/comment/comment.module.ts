import { Module } from '@nestjs/common'
import { CommentService } from './comment.service'
import { StudentCommentController, TeacherCommentController } from './comment.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CommentEntity } from './comment.entity'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { User } from '@modules/users/user.entity'
import { Teacher } from '@modules/teachers/teachers.entity'

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, ClassActivitiesEntity, User, ClassStudents, Teacher])],
  controllers: [StudentCommentController, TeacherCommentController],
  providers: [CommentService],
})
export class StudentCommentModule {}
