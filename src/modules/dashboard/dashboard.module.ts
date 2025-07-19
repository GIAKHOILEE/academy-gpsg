import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DashboardController, DashboardControllerUser } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { Visitor } from '../visitor/visitor.entity'
import { VisitorService } from '../visitor/visitor.service'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Visitor, Enrollments])],
  controllers: [DashboardController, DashboardControllerUser],
  providers: [DashboardService, VisitorService],
})
export class DashboardModule {}
