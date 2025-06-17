import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { EventsService } from './events.service'
import { CreateEventDto } from './dtos/create-events.dto'
import { IEvent } from './events.interface'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'
import { ResponseDto } from '@common/response.dto'
import { PaginateEventDto } from './dtos/paginate-events.dto'
import { UpdateEventDto } from './dtos/update-events.dto'

@ApiTags('Admin Events')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a event' })
  async createEvent(@Body() createEventDto: CreateEventDto): Promise<ResponseDto> {
    const event = await this.eventsService.createEvent(createEventDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'EVENT_CREATED_SUCCESSFULLY',
      data: event,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  async getEvents(@Query() paginateEventDto: PaginateEventDto): Promise<ResponseDto> {
    const events = await this.eventsService.getEvents(paginateEventDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENTS_FETCHED_SUCCESSFULLY',
      data: events.data,
      meta: events.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a event by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Event id' })
  async getEventById(@Param('id') id: number): Promise<ResponseDto> {
    const event = await this.eventsService.getEventById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENT_FETCHED_SUCCESSFULLY',
      data: event,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a event' })
  @ApiParam({ name: 'id', type: Number, description: 'Event id' })
  async updateEvent(@Param('id') id: number, @Body() updateEventDto: UpdateEventDto): Promise<ResponseDto> {
    await this.eventsService.updateEvent(id, updateEventDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENT_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a event' })
  @ApiParam({ name: 'id', type: Number, description: 'Event id' })
  async deleteEvent(@Param('id') id: number): Promise<ResponseDto> {
    await this.eventsService.deleteEvent(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENT_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('User Events')
@Controller('events')
export class UserEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  async getEvents(@Query() paginateEventDto: PaginateEventDto): Promise<ResponseDto> {
    const events = await this.eventsService.getEvents(paginateEventDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENTS_FETCHED_SUCCESSFULLY',
      data: events.data,
      meta: events.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a event by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Event id' })
  async getEventById(@Param('id') id: number): Promise<ResponseDto> {
    const event = await this.eventsService.getEventById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'EVENT_FETCHED_SUCCESSFULLY',
      data: event,
    })
  }
}
