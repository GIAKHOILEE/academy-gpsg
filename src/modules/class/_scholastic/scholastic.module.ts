import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Scholastic } from './scholastic.entity'
import { AdminScholasticController } from './scholastic.controller'
import { ScholasticService } from './scholastic.service'
import { Classes } from '../class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Scholastic, Classes])],
  controllers: [AdminScholasticController],
  providers: [ScholasticService],
  exports: [ScholasticService],
})
export class ScholasticModule {}
