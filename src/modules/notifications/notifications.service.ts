import { HttpStatus, Injectable, Post } from '@nestjs/common'

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
    const notificationMaxIndex = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('MAX(notification.index) as maxIndex')
      .getRawOne()

    let maxIndex = 1.0001
    if (notificationMaxIndex?.maxIndex) {
      maxIndex = notificationMaxIndex.maxIndex + 100
    }

    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      index: maxIndex,
    })
    const savedNotification = await this.notificationRepository.save(notification)

    const formattedNotification: INotification = {
      id: savedNotification.id,
      index: savedNotification.index,
      is_active: savedNotification.is_active,
      is_banner: savedNotification.is_banner,
      title: savedNotification.title,
      thumbnail: savedNotification.thumbnail,
      description: savedNotification.description,
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

  async updateIsActive(id: number): Promise<void> {
    const notification = await this.notificationRepository
      .createQueryBuilder('notification')
      .select(['notification.id', 'notification.is_active'])
      .where('notification.id = :id', { id })
      .getOne()

    if (!notification) {
      throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND)
    }
    await this.notificationRepository
      .createQueryBuilder('notification')
      .update(Notification)
      .set({ is_active: !notification.is_active })
      .where('id = :id', { id })
      .execute()
    return
  }

  async updateIsBanner(id: number): Promise<void> {
    const notification = await this.notificationRepository
      .createQueryBuilder('notification')
      .select(['notification.id', 'notification.is_banner'])
      .where('notification.id = :id', { id })
      .getOne()

    if (!notification) {
      throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND)
    }
    await this.notificationRepository
      .createQueryBuilder('notification')
      .update(Notification)
      .set({ is_banner: !notification.is_banner })
      .where('id = :id', { id })
      .execute()
    return
  }
  async updateIndex(id: number, index: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id } })
    if (!notification) {
      throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND)
    }
    await this.notificationRepository.createQueryBuilder('notification').update(Notification).set({ index }).where('id = :id', { id }).execute()
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
      index: notification.index,
      is_active: notification.is_active,
      is_banner: notification.is_banner,
      title: notification.title,
      thumbnail: notification.thumbnail,
      description: notification.description,
      content: notification.content,
      created_at: formatStringDate(notification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async getNotifications(
    paginateNotificationDto: PaginateNotificationDto,
    isAdmin: boolean,
  ): Promise<{ data: INotification[]; meta: PaginationMeta }> {
    const query = this.notificationRepository.createQueryBuilder('notification')
    if (!isAdmin) {
      query.where('notification.is_active = :isActive', { isActive: true })
    }

    const { data, meta } = await paginate(query, paginateNotificationDto)

    const formattedNotifications: INotification[] = data.map(notification => ({
      id: notification.id,
      index: notification.index,
      is_active: notification.is_active,
      is_banner: notification.is_banner,
      title: notification.title,
      thumbnail: notification.thumbnail,
      description: notification.description,
      content: notification.content,
      created_at: formatStringDate(notification.created_at.toISOString()),
    }))

    return { data: formattedNotifications, meta }
  }
}
