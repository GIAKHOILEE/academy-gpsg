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
    const startDate = createEventDto.start_date ? new Date(createEventDto.start_date) : null
    const endDate = createEventDto.end_date ? new Date(createEventDto.end_date) : null

    const eventMaxIndex = await this.eventRepository.createQueryBuilder('event').select('MAX(event.index) as maxIndex').getRawOne()

    let maxIndex = 1.0001
    if (eventMaxIndex?.maxIndex) {
      maxIndex = eventMaxIndex.maxIndex + 100
    }

    if (startDate && endDate && startDate > endDate) {
      throwAppException('START_DATE_MUST_BE_BEFORE_END_DATE', ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      index: maxIndex,
    })
    const savedEvent = await this.eventRepository.save(event)

    const formattedEvent: IEvent = {
      id: savedEvent.id,
      index: savedEvent.index,
      is_active: savedEvent.is_active,
      is_banner: savedEvent.is_banner,
      title: savedEvent.title,
      thumbnail: savedEvent.thumbnail,
      description: savedEvent.description,
      content: savedEvent.content,
      start_date: savedEvent.start_date,
      end_date: savedEvent.end_date,
    }

    return formattedEvent
  }

  async updateEvent(id: number, updateEventDto: UpdateEventDto): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const startDate = updateEventDto.start_date ? new Date(updateEventDto.start_date) : null
    const endDate = updateEventDto.end_date ? new Date(updateEventDto.end_date) : null

    if (startDate && endDate && startDate > endDate) {
      throwAppException('START_DATE_MUST_BE_BEFORE_END_DATE', ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    await this.eventRepository.update(id, updateEventDto)
  }

  async updateIsActive(id: number): Promise<void> {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .select(['event.id', 'event.is_active'])
      .where('event.id = :id', { id })
      .getOne()
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.eventRepository.createQueryBuilder('event').update(Event).set({ is_active: !event.is_active }).where('id = :id', { id }).execute()
    return
  }

  async updateIsBanner(id: number): Promise<void> {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .select(['event.id', 'event.is_banner'])
      .where('event.id = :id', { id })
      .getOne()
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.eventRepository.createQueryBuilder('event').update(Event).set({ is_banner: !event.is_banner }).where('id = :id', { id }).execute()
    return
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.eventRepository.createQueryBuilder('event').update(Event).set({ index }).where('id = :id', { id }).execute()
    return
  }

  async deleteEvent(id: number): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.eventRepository.delete(id)
  }

  async getEventById(id: number): Promise<IEvent> {
    const event = await this.eventRepository.findOne({ where: { id } })
    if (!event) throwAppException('EVENT_NOT_FOUND', ErrorCode.EVENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedEvent: IEvent = {
      id: event.id,
      index: event.index,
      is_active: event.is_active,
      is_banner: event.is_banner,
      title: event.title,
      thumbnail: event.thumbnail,
      description: event.description,
      content: event.content,
      start_date: event.start_date,
      end_date: event.end_date,
    }

    return formattedEvent
  }

  async getEvents(paginateEventDto: PaginateEventDto, isAdmin: boolean): Promise<{ data: IEvent[]; meta: PaginationMeta }> {
    const query = this.eventRepository.createQueryBuilder('event')
    if (!isAdmin) {
      query.where('event.is_active = :isActive', { isActive: true })
    }
    const { data, meta } = await paginate(query, paginateEventDto)

    const formattedData: IEvent[] = data.map((event: Event) => ({
      id: event.id,
      index: event.index,
      is_active: event.is_active,
      is_banner: event.is_banner,
      title: event.title,
      thumbnail: event.thumbnail,
      description: event.description,
      content: event.content,
      start_date: event.start_date,
      end_date: event.end_date,
    }))

    return { data: formattedData, meta }
  }
}
