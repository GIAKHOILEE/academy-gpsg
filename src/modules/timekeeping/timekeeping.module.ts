import { Module } from '@nestjs/common'
import { AdminTimekeepingController } from './timekeeping.controller'
import { TimekeepingService } from './timekeeping.service'
import { Timekeeping } from './timekeeping.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Timekeeping])],
  controllers: [AdminTimekeepingController],
  providers: [TimekeepingService],
})
export class TimekeepingModule {}
