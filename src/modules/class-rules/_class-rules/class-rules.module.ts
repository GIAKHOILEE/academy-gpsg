import { Module } from '@nestjs/common'
import { ClassRulesService } from './class-rules.service'
import { AdminClassRulesController, TeacherClassRulesController, UserClassRulesController } from './class-rules.controller'
import { ClassRule } from './class-rules.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ClassRule, Classes])],
  controllers: [AdminClassRulesController, TeacherClassRulesController, UserClassRulesController],
  providers: [ClassRulesService],
})
export class ClassRulesModule {}
