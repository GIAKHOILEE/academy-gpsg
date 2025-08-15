import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminTeachersController, TeacherController } from './teachers.controller'
import { Teacher } from './teachers.entity'
import { TeachersService } from './teachers.service'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { HttpModule } from '@nestjs/axios'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Classes, ClassStudents]), HttpModule],
  controllers: [AdminTeachersController, TeacherController],
  providers: [TeachersService, BrevoMailerService],
  exports: [TeachersService],
})
export class TeachersModule {}
