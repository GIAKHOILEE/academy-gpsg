import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinancesEntity } from './finances.entity'
import { FinancesService } from './finances.service'
import { AdminFinancesController } from './finances.controller'

@Module({
  imports: [TypeOrmModule.forFeature([FinancesEntity])],
  providers: [FinancesService],
  controllers: [AdminFinancesController],
  exports: [FinancesService],
})
export class FinancesModule {}
