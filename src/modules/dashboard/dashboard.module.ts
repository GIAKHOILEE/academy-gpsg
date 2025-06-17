import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DashboardController, DashboardControllerUser } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { Visitor } from '../visitor/visitor.entity'
import { VisitorService } from '../visitor/visitor.service'
@Module({
  imports: [TypeOrmModule.forFeature([Visitor])],
  controllers: [DashboardController, DashboardControllerUser],
  providers: [DashboardService, VisitorService],
})
export class DashboardModule {}
