import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Consult } from './consult.entity'
import { ConsultService } from './consult.service'
import { AdminConsultController } from './consult.controller'
import { UserConsultController } from './consult.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Consult])],
  controllers: [AdminConsultController, UserConsultController],
  providers: [ConsultService],
})
export class ConsultModule {}
