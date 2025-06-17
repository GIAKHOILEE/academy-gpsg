import { Injectable, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Calendars } from './calendars.entity'
import { CreateCalendarsDto } from './dtos/create-calendars.dto'
import { ICalendars } from './calendars.interface'
import { UpdateCalendarsDto } from './dtos/update-calendars.dto'
import { PaginateCalendarsDto } from './dtos/pagiante-calendars.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class CalendarsService {
  constructor(
    @InjectRepository(Calendars)
    private readonly calendarsRepository: Repository<Calendars>,
  ) {}

  async createCalendars(createCalendarsDto: CreateCalendarsDto): Promise<ICalendars> {
    const calendars = this.calendarsRepository.create(createCalendarsDto)
    const calendar = await this.calendarsRepository.save(calendars)

    const calendarResponse: ICalendars = {
      id: calendar.id,
      title: calendar.title,
      content: calendar.content,
      day: calendar.day,
    }

    return calendarResponse
  }

  async updateCalendars(id: number, updateCalendarsDto: UpdateCalendarsDto): Promise<void> {
    const calendars = await this.calendarsRepository.exists({ where: { id } })
    if (!calendars) {
      throw new NotFoundException('CALENDAR_NOT_FOUND')
    }

    await this.calendarsRepository.update(id, updateCalendarsDto)

    return
  }

  async deleteCalendars(id: number): Promise<void> {
    const calendars = await this.calendarsRepository.exists({ where: { id } })
    if (!calendars) {
      throw new NotFoundException('CALENDAR_NOT_FOUND')
    }

    await this.calendarsRepository.delete(id)
  }

  async getCalendars(paginateCalendarsDto: PaginateCalendarsDto): Promise<{ data: ICalendars[]; meta: PaginationMeta }> {
    const query = this.calendarsRepository.createQueryBuilder('calendars')
    const { data, meta } = await paginate(query, paginateCalendarsDto)

    const formattedData: ICalendars[] = data.map((calendar: Calendars) => ({
      id: calendar.id,
      title: calendar.title,
      content: calendar.content,
      day: calendar.day,
    }))

    return { data: formattedData, meta }
  }

  async getCalendarsById(id: number): Promise<ICalendars> {
    const calendar = await this.calendarsRepository.findOne({ where: { id } })
    if (!calendar) {
      throw new NotFoundException('CALENDAR_NOT_FOUND')
    }

    const calendarResponse: ICalendars = {
      id: calendar.id,
      title: calendar.title,
      content: calendar.content,
      day: calendar.day,
    }

    return calendarResponse
  }
}
