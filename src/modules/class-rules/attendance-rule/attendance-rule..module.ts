import { Module } from '@nestjs/common'
import { AttendanceRuleService } from './attendance-rule.service'
import { AdminAttendanceRuleController, UserAttendanceRuleController } from './attendance-rule.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceRule } from './attendance-rule.entity'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRule, Classes])],
  controllers: [AdminAttendanceRuleController, UserAttendanceRuleController],
  providers: [AttendanceRuleService],
})
export class AttendanceRuleModule {}
