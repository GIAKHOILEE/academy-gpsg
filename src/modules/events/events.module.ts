import { Module } from '@nestjs/common'
import { EventsService } from './events.service'
import { AdminEventsController, UserEventsController } from './events.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Event } from './events.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [AdminEventsController, UserEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
