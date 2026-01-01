import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { paginate, PaginationMeta } from '@common/pagination'
import { formatStringDateUTC7, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { CreateClassNotificationDto } from './dtos/create-notifications.dto'
import { PaginateClassNotificationDto } from './dtos/paginate-notifications.dto'
import { UpdateClassNotificationDto } from './dtos/update-notifications.dto'
import { ClassNotification } from './notifications.entity'
import { IClassNotification } from './notifications.interface'
import { Classes } from '../class.entity'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(ClassNotification)
    private classNotificationRepository: Repository<ClassNotification>,
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  async createNotification(createNotificationDto: CreateClassNotificationDto): Promise<IClassNotification> {
    const existClass = await this.classRepository.findOne({ where: { id: createNotificationDto.class_id } })
    if (!existClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    if (!existClass.is_online) {
      throwAppException('CLASS_IS_NOT_ONLINE', ErrorCode.CLASS_IS_NOT_ONLINE, HttpStatus.BAD_REQUEST)
    }

    const notificationMaxIndex = await this.classNotificationRepository
      .createQueryBuilder('notification')
      .select('MAX(notification.index) as maxIndex')
      .getRawOne()

    let maxIndex = 1.0001
    if (notificationMaxIndex?.maxIndex) {
      maxIndex = notificationMaxIndex.maxIndex + 100
    }

    if (createNotificationDto.lesson_id) {
      const existLesson = await this.lessonRepository.findOne({ where: { id: createNotificationDto.lesson_id } })
      if (!existLesson) throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const notification = this.classNotificationRepository.create({
      ...createNotificationDto,
      index: maxIndex,
      class: existClass,
    })
    const savedNotification = await this.classNotificationRepository.save(notification)

    const formattedNotification: IClassNotification = {
      id: savedNotification.id,
      index: savedNotification.index,
      is_active: savedNotification.is_active,
      is_online: savedNotification.is_online,
      title: savedNotification.title,
      thumbnail: savedNotification.thumbnail,
      description: savedNotification.description,
      content: savedNotification.content,
      urgent: savedNotification.urgent,
      created_at: formatStringDateUTC7(savedNotification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async updateNotification(id: number, updateNotificationDto: UpdateClassNotificationDto): Promise<void> {
    const notification = await this.classNotificationRepository.exists({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.classNotificationRepository.update(id, updateNotificationDto)
  }

  async updateIsActive(id: number): Promise<void> {
    const notification = await this.classNotificationRepository
      .createQueryBuilder('notification')
      .select(['notification.id', 'notification.is_active'])
      .where('notification.id = :id', { id })
      .getOne()

    if (!notification) {
      throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND)
    }
    await this.classNotificationRepository
      .createQueryBuilder('notification')
      .update(ClassNotification)
      .set({ is_active: !notification.is_active })
      .where('id = :id', { id })
      .execute()
    return
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const notification = await this.classNotificationRepository.findOne({ where: { id } })
    if (!notification) {
      throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND)
    }
    await this.classNotificationRepository
      .createQueryBuilder('notification')
      .update(ClassNotification)
      .set({ index })
      .where('id = :id', { id })
      .execute()
  }

  async deleteNotification(id: number): Promise<void> {
    const notification = await this.classNotificationRepository.exists({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.classNotificationRepository.delete(id)
  }

  async getNotificationById(id: number): Promise<IClassNotification> {
    const notification = await this.classNotificationRepository.findOne({ where: { id } })
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedNotification: IClassNotification = {
      id: notification.id,
      index: notification.index,
      is_active: notification.is_active,
      is_online: notification.is_online,
      title: notification.title,
      thumbnail: notification.thumbnail,
      description: notification.description,
      content: notification.content,
      urgent: notification.urgent,
      created_at: formatStringDateUTC7(notification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async getNotifications(
    paginateNotificationDto: PaginateClassNotificationDto,
    isAdmin: boolean,
  ): Promise<{ data: IClassNotification[]; meta: PaginationMeta }> {
    const query = this.classNotificationRepository.createQueryBuilder('notification')
    if (!isAdmin) {
      query.where('notification.is_active = :isActive', { isActive: true })
    }

    const { data, meta } = await paginate(query, paginateNotificationDto)

    const formattedNotifications: IClassNotification[] = data.map(notification => ({
      id: notification.id,
      index: notification.index,
      is_active: notification.is_active,
      is_online: notification.is_online,
      title: notification.title,
      thumbnail: notification.thumbnail,
      description: notification.description,
      content: notification.content,
      urgent: notification.urgent,
      created_at: formatStringDateUTC7(notification.created_at.toISOString()),
      lesson_id: notification.lesson_id,
      class_id: notification.class_id,
    }))

    return { data: formattedNotifications, meta }
  }
}
