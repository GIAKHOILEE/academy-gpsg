import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Visitor } from './visitor.entity'
import { VisitorService } from './visitor.service'

@Module({
  imports: [TypeOrmModule.forFeature([Visitor])],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}
