import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Subject } from './subjects.entity'
import { SubjectsService } from './subjects.service'
import { SubjectsController } from './subjects.controller'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Subject, Classes])],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService],
})
export class SubjectsModule {}
