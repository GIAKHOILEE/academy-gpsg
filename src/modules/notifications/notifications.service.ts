import { HttpStatus, Injectable } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { paginate, PaginationMeta } from '@common/pagination'
import { formatStringDate, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { CreateNotificationDto } from './dtos/create-notification.dto'
import { PaginateNotificationDto } from './dtos/paginate-notification.dto'
import { UpdateNotificationDto } from './dtos/update-notification.dto'
import { Notification } from './notifications.entity'
import { INotification } from './notifications.interface'
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<INotification> {
    const notification = this.notificationRepository.create(createNotificationDto)
    const savedNotification = await this.notificationRepository.save(notification)

    const formattedNotification: INotification = {
      id: savedNotification.id,
      title: savedNotification.title,
      thumbnail: savedNotification.thumbnail,
      content: savedNotification.content,
      created_at: formatStringDate(savedNotification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async updateNotification(id: number, updateNotificationDto: UpdateNotificationDto): Promise<void> {
    const notification = await this.notificationRepository.exists({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.notificationRepository.update(id, updateNotificationDto)
  }

  async deleteNotification(id: number): Promise<void> {
    const notification = await this.notificationRepository.exists({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.notificationRepository.delete(id)
  }

  async getNotificationById(id: number): Promise<INotification> {
    const notification = await this.notificationRepository.findOne({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedNotification: INotification = {
      id: notification.id,
      title: notification.title,
      thumbnail: notification.thumbnail,
      content: notification.content,
      created_at: formatStringDate(notification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async getNotifications(paginateNotificationDto: PaginateNotificationDto): Promise<{ data: INotification[]; meta: PaginationMeta }> {
    const query = this.notificationRepository.createQueryBuilder('notification')

    const { data, meta } = await paginate(query, paginateNotificationDto)

    const formattedNotifications: INotification[] = data.map(notification => ({
      id: notification.id,
      title: notification.title,
      thumbnail: notification.thumbnail,
      content: notification.content,
      created_at: formatStringDate(notification.created_at.toISOString()),
    }))

    return { data: formattedNotifications, meta }
  }
}
