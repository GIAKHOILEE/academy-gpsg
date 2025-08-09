import { Module } from '@nestjs/common'
import { EnrollmentsService } from './enrollments.service'
import { EnrollmentsController, AdminEnrollmentsController } from './enrollments.controller'
import { Enrollments } from './enrollments.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'
import { User } from '@modules/users/user.entity'
import { ScheduleModule } from '@nestjs/schedule'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { HttpModule } from '@nestjs/axios'
import { Voucher } from '@modules/voucher/voucher.entity'
import { Footer } from '@modules/footer/footer.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Enrollments, Student, Classes, User, Voucher, Footer]), ScheduleModule.forRoot(), HttpModule],
  controllers: [AdminEnrollmentsController, EnrollmentsController],
  providers: [EnrollmentsService, BrevoMailerService],
})
export class EnrollmentsModule {}
