import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateEventDto } from './dtos/create-events.dto'
import { PaginateEventDto } from './dtos/paginate-events.dto'
import { UpdateEventDto } from './dtos/update-events.dto'
import { Event } from './events.entity'
import { IEvent } from './events.interface'

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<IEvent> {
    if (createEventDto.start_date && createEventDto.end_date && createEventDto.start_date > createEventDto.end_date) {
      throwAppException(ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    const event = this.eventRepository.create(createEventDto)
    const savedEvent = await this.eventRepository.save(event)

    const formattedEvent: IEvent = {
      id: savedEvent.id,
      title: savedEvent.title,
      thumbnail: savedEvent.thumbnail,
      content: savedEvent.content,
      start_date: savedEvent.start_date,
      end_date: savedEvent.end_date,
    }

    return formattedEvent
  }

  async updateEvent(id: number, updateEventDto: UpdateEventDto): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException(ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (updateEventDto.start_date && updateEventDto.end_date && updateEventDto.start_date > updateEventDto.end_date) {
      throwAppException(ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    if (updateEventDto.start_date && updateEventDto.start_date > event.end_date) {
      throwAppException(ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    if (updateEventDto.end_date && updateEventDto.end_date < event.start_date) {
      throwAppException(ErrorCode.END_DATE_MUST_BE_AFTER_START_DATE, HttpStatus.BAD_REQUEST)
    }

    await this.eventRepository.update(id, updateEventDto)
  }

  async deleteEvent(id: number): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException(ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.eventRepository.delete(id)
  }

  async getEventById(id: number): Promise<IEvent> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException(ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedEvent: IEvent = {
      id: event.id,
      title: event.title,
      thumbnail: event.thumbnail,
      content: event.content,
      start_date: event.start_date,
      end_date: event.end_date,
    }

    return formattedEvent
  }

  async getEvents(paginateEventDto: PaginateEventDto): Promise<{ data: IEvent[]; meta: PaginationMeta }> {
    const query = this.eventRepository.createQueryBuilder('event')
    const { data, meta } = await paginate(query, paginateEventDto)

    const formattedData: IEvent[] = data.map((event: Event) => ({
      id: event.id,
      title: event.title,
      thumbnail: event.thumbnail,
      content: event.content,
      start_date: event.start_date,
      end_date: event.end_date,
    }))

    return { data: formattedData, meta }
  }
}
