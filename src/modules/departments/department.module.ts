import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Department } from './departments.entity'
import { AdminDepartmentController, DepartmentController } from './department.controller'
import { DepartmentService } from './department.service'
import { Subject } from '@modules/subjects/subjects.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Department, Subject])],
  controllers: [AdminDepartmentController, DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
