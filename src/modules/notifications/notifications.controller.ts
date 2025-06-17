import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'

import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateNotificationDto } from './dtos/create-notification.dto'
import { PaginateNotificationDto } from './dtos/paginate-notification.dto'
import { UpdateNotificationDto } from './dtos/update-notification.dto'
import { NotificationsService } from './notifications.service'

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto): Promise<ResponseDto> {
    const notification = await this.notificationsService.createNotification(createNotificationDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'NOTIFICATION_CREATED',
      data: notification,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getNotifications(@Query() paginateNotificationDto: PaginateNotificationDto): Promise<ResponseDto> {
    const notifications = await this.notificationsService.getNotifications(paginateNotificationDto)
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

  @Put(':id')
  @ApiOperation({ summary: 'Update a notification by id' })
  @ApiParam({ name: 'id', type: Number })
  async updateNotification(@Param('id') id: number, @Body() updateNotificationDto: UpdateNotificationDto): Promise<ResponseDto> {
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

@ApiTags('User Notifications')
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getNotifications(@Query() paginateNotificationDto: PaginateNotificationDto): Promise<ResponseDto> {
    const notifications = await this.notificationsService.getNotifications(paginateNotificationDto)
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
