import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateClassNotificationDto } from './dtos/create-notifications.dto'
import { PaginateClassNotificationDto } from './dtos/paginate-notifications.dto'
import { UpdateClassNotificationDto } from './dtos/update-notifications.dto'
import { NotificationsService } from './notifications.service'

@ApiTags('Admin Class Notifications Online')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/class/notifications/online')
export class AdminNotificationsOnlineController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  async createNotification(@Body() createNotificationDto: CreateClassNotificationDto): Promise<ResponseDto> {
    const notification = await this.notificationsService.createNotification(createNotificationDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'NOTIFICATION_CREATED',
      data: notification,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getNotifications(@Query() paginateNotificationDto: PaginateClassNotificationDto): Promise<ResponseDto> {
    const notifications = await this.notificationsService.getNotifications(paginateNotificationDto, true)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATIONS_FETCHED',
      data: notifications.data,
      meta: notifications.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async getNotificationById(@Param('id') id: number): Promise<ResponseDto> {
    const notification = await this.notificationsService.getNotificationById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_FETCHED',
      data: notification,
    })
  }

  @Put('is-active/:id')
  @ApiOperation({ summary: 'Update is active a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateIsActive(@Param('id') id: number): Promise<ResponseDto> {
    await this.notificationsService.updateIsActive(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_UPDATED',
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Update index a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateIndex(@Param('id') id: number, @Query('index') index: number): Promise<ResponseDto> {
    await this.notificationsService.updateIndex(id, index)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_UPDATED',
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateNotification(@Param('id') id: number, @Body() updateNotificationDto: UpdateClassNotificationDto): Promise<ResponseDto> {
    await this.notificationsService.updateNotification(id, updateNotificationDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_UPDATED',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async deleteNotification(@Param('id') id: number): Promise<ResponseDto> {
    await this.notificationsService.deleteNotification(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_DELETED',
    })
  }
}

@ApiTags('User Class Notifications Online')
@Controller('class/notifications/online')
export class UserNotificationsOnlineController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getNotifications(@Query() paginateNotificationDto: PaginateClassNotificationDto): Promise<ResponseDto> {
    const notifications = await this.notificationsService.getNotifications(paginateNotificationDto, false)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATIONS_FETCHED',
      data: notifications.data,
      meta: notifications.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async getNotificationById(@Param('id') id: number): Promise<ResponseDto> {
    const notification = await this.notificationsService.getNotificationById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'NOTIFICATION_FETCHED',
      data: notification,
    })
  }
}
