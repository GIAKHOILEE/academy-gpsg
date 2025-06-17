import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminCalendarsController, UserCalendarsController } from './calendars.controller'
import { Calendars } from './calendars.entity'
import { CalendarsService } from './calendars.service'
@Module({
  imports: [TypeOrmModule.forFeature([Calendars])],
  controllers: [AdminCalendarsController, UserCalendarsController],
  providers: [CalendarsService],
  exports: [CalendarsService],
})
export class CalendarsModule {}
