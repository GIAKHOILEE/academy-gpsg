import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Scholastic } from './scholastic.entity'
import { AdminScholasticController } from './scholastic.controller'
import { ScholasticService } from './scholastic.service'
import { Classes } from '../class.entity'
import { ScholasticController } from './scholastic.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Scholastic, Classes])],
  controllers: [AdminScholasticController, ScholasticController],
  providers: [ScholasticService],
  exports: [ScholasticService],
})
export class ScholasticModule {}
