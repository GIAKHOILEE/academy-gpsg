import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Subject } from './subjects.entity'
import { SubjectsService } from './subjects.service'
import { SubjectsController } from './subjects.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Subject])],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService],
})
export class SubjectsModule {}
