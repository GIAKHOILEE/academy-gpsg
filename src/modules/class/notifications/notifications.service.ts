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
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '../class-students/class-student.entity'
import { User } from '@modules/users/user.entity'
import { Role } from '@enums/role.enum'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(ClassNotification)
    private classNotificationRepository: Repository<ClassNotification>,
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  // đánh dấu đã đọc thông báo
  async markAsRead(id: number, userId: number): Promise<void> {
    const notification = await this.classNotificationRepository
      .createQueryBuilder('notification')
      .select(['notification.id', 'notification.user_read_ids', 'class.id'])
      .leftJoin('notification.class', 'class')
      .where('notification.id = :id', { id })
      .getOne()
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)
    if (!notification.class.id) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    // user
    const existUser = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.role'])
      .where('user.id = :userId', { userId })
      .getOne()
    if (!existUser) throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)

    // nếu role là student check student có trong class không
    if (existUser.role === Role.STUDENT) {
      const existStudent = await this.studentRepository.createQueryBuilder('student').where('student.user_id = :userId', { userId }).getOne()
      if (!existStudent) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
      const classStudent = await this.classStudentRepository
        .createQueryBuilder('classStudent')
        .where('classStudent.student_id = :studentId', { studentId: existStudent.id })
        .andWhere('classStudent.class_id = :classId', { classId: notification.class.id })
        .getOne()
      if (!classStudent) throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }

    // nếu role là teacher thì check có dạy class không
    if (existUser.role === Role.TEACHER) {
      const classTeacher = await this.classRepository
        .createQueryBuilder('class')
        .select('class.id')
        .where('class.teacher_id = :userId', { userId })
        .andWhere('class.id = :classId', { classId: notification.class.id })
        .getOne()
      if (!classTeacher) throwAppException('TEACHER_NOT_IN_CLASS', ErrorCode.TEACHER_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }

    const userReadIds = notification.user_read_ids || []
    if (userReadIds.includes(userId)) return
    userReadIds.push(userId)
    await this.classNotificationRepository.update(id, { user_read_ids: userReadIds })
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

  async getNotificationById(id: number, userId?: number): Promise<IClassNotification> {
    const notification = await this.classNotificationRepository
      .createQueryBuilder('notification')
      .select([
        'notification.id',
        'notification.index',
        'notification.is_active',
        'notification.is_online',
        'notification.title',
        'notification.thumbnail',
        'notification.description',
        'notification.content',
        'notification.urgent',
        'notification.user_read_ids',
        'notification.lesson_id',
        'notification.created_at',
        'lesson.id',
        'lesson.title',
      ])
      .where('notification.id = :id', { id })
      .leftJoin('notification.lesson', 'lesson')
      .getOne()
    if (!notification) throwAppException('NOTIFICATION_NOT_FOUND', ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND)

    const isRead = !!userId && notification.user_read_ids.includes(userId)
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
      lesson_id: notification?.lesson_id || null,
      lesson: {
        id: notification.lesson?.id || null,
        title: notification.lesson?.title || null,
      },
      is_read: isRead,
      created_at: formatStringDateUTC7(notification.created_at.toISOString()),
    }

    return formattedNotification
  }

  async getNotifications(
    paginateNotificationDto: PaginateClassNotificationDto,
    isAdmin: boolean,
    userId?: number,
  ): Promise<{ data: IClassNotification[]; meta: PaginationMeta }> {
    const query = this.classNotificationRepository.createQueryBuilder('notification')

    if (!isAdmin) {
      query.where('notification.is_active = :isActive', { isActive: true })
    }

    const { data, meta } = await paginate(query, paginateNotificationDto)

    const formattedNotifications: IClassNotification[] = data.map(notification => {
      const isRead = !!userId && Array.isArray(notification.user_read_ids) && notification.user_read_ids.includes(userId)

      return {
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
        is_read: isRead,
      }
    })

    return { data: formattedNotifications, meta }
  }
}
