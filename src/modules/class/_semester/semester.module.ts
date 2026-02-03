import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Semester } from './semester.entity'
import { AdminSemesterController } from './semester.controller'
import { SemesterService } from './semester.service'
import { Classes } from '../class.entity'
import { SemesterController } from './semester.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Semester, Classes])],
  controllers: [AdminSemesterController, SemesterController],
  providers: [SemesterService],
  exports: [SemesterService],
})
export class SemesterModule {}
