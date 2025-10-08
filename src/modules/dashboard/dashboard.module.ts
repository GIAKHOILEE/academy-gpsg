import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DashboardControllerUser } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { Visitor } from '../visitor/visitor.entity'
import { VisitorService } from '../visitor/visitor.service'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { Voucher } from '@modules/voucher/voucher.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { RevenueController } from './dashboard.controller'
import { User } from '@modules/users/user.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Visitor, Enrollments, Voucher, Classes, Student, Teacher, User])],
  controllers: [DashboardControllerUser, RevenueController],
  providers: [DashboardService, VisitorService],
})
export class DashboardModule {}
