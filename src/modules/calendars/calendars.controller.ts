import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CalendarsService } from './calendars.service'
import { CreateCalendarsDto } from './dtos/create-calendars.dto'
import { PaginateCalendarsDto } from './dtos/pagiante-calendars.dto'
import { UpdateCalendarsDto } from './dtos/update-calendars.dto'

@ApiTags('Admin Calendars')
@Controller('admin/calendars')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminCalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a calendar' })
  async createCalendars(@Body() createCalendarsDto: CreateCalendarsDto): Promise<ResponseDto> {
    const calendar = await this.calendarsService.createCalendars(createCalendarsDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CALENDAR_CREATED_SUCCESSFULLY',
      data: calendar,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all calendars' })
  async getCalendars(@Query() paginateCalendarsDto: PaginateCalendarsDto): Promise<ResponseDto> {
    const calendars = await this.calendarsService.getCalendars(paginateCalendarsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDARS_FETCHED_SUCCESSFULLY',
      data: calendars.data,
      meta: calendars.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calendar by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Calendar id' })
  async getCalendarsById(@Param('id') id: number): Promise<ResponseDto> {
    const calendar = await this.calendarsService.getCalendarsById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDAR_FETCHED_SUCCESSFULLY',
      data: calendar,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a calendar by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Calendar id' })
  async updateCalendarsById(@Param('id') id: number, @Body() updateCalendarsDto: UpdateCalendarsDto): Promise<ResponseDto> {
    const calendar = await this.calendarsService.updateCalendars(id, updateCalendarsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDAR_UPDATED_SUCCESSFULLY',
      data: calendar,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a calendar by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Calendar id' })
  async deleteCalendarsById(@Param('id') id: number): Promise<ResponseDto> {
    const calendar = await this.calendarsService.deleteCalendars(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDAR_DELETED_SUCCESSFULLY',
      data: calendar,
    })
  }
}

@ApiTags('User Calendars')
@Controller('user/calendars')
export class UserCalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendars' })
  async getCalendars(@Query() paginateCalendarsDto: PaginateCalendarsDto): Promise<ResponseDto> {
    const calendars = await this.calendarsService.getCalendars(paginateCalendarsDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDARS_FETCHED_SUCCESSFULLY',
      data: calendars.data,
      meta: calendars.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calendar by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Calendar id' })
  async getCalendarsById(@Param('id') id: number): Promise<ResponseDto> {
    const calendar = await this.calendarsService.getCalendarsById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CALENDAR_FETCHED_SUCCESSFULLY',
      data: calendar,
    })
  }
}
