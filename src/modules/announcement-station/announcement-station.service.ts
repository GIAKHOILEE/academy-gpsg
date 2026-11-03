import { paginate, PaginationMeta } from '@common/pagination'
import { removeVietnameseTones, throwAppException } from '@common/utils'
import { AnnouncementStatus, AnnouncementType } from '@enums/announcement.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { AnnouncementDto } from '@modules/announcement-station/dtos/announcement.dto'
import { PaginateAnnouncementStationDto } from '@modules/announcement-station/dtos/paginate-announcement-station.dto'
import { SmsGatewayService } from '@modules/sms-gateway/sms-gateway.service'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { Brackets, In, Repository } from 'typeorm'

import { AnnouncementStation } from './announcement-station.entity'

@Injectable()
export class AnnouncementStationService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(AnnouncementStation)
    private readonly announcementStationRepository: Repository<AnnouncementStation>,
    private readonly emailService: BrevoMailerService,
    private readonly smsGatewayService: SmsGatewayService,
  ) {}

  async getAnnouncements(paginateDto: PaginateAnnouncementStationDto): Promise<{ data: any[]; meta: PaginationMeta }> {
    const {
      page,
      limit,
      orderBy,
      orderDirection,
      anotherOrderBy,
      type,
      status,
      role,
      title,
      content,
      email,
      phone_number,
      target_id,
      user_id,
      sms_job_uid,
      full_name,
      from_date,
      to_date,
    } = paginateDto

    const qb = this.announcementStationRepository
      .createQueryBuilder('announcement')
      .withDeleted()
      .leftJoinAndMapOne('announcement.user', User, 'user', 'user.id = announcement.user_id')

    if (type) {
      qb.andWhere('announcement.type = :type', { type })
    }

    if (status) {
      qb.andWhere('announcement.status = :status', { status })
    }

    if (role !== undefined && role !== null && (role as any) !== '') {
      qb.andWhere('announcement.role = :role', { role: Number(role) })
    }

    if (target_id !== undefined && target_id !== null && (target_id as any) !== '') {
      qb.andWhere('announcement.target_id = :target_id', { target_id: Number(target_id) })
    }

    if (user_id !== undefined && user_id !== null && (user_id as any) !== '') {
      qb.andWhere('announcement.user_id = :user_id', { user_id: Number(user_id) })
    }

    if (sms_job_uid?.trim()) {
      qb.andWhere('announcement.sms_job_uid = :sms_job_uid', { sms_job_uid: sms_job_uid.trim() })
    }

    if (title?.trim()) {
      qb.andWhere('LOWER(announcement.title) LIKE :title', { title: `%${title.trim().toLowerCase()}%` })
    }

    if (content?.trim()) {
      qb.andWhere('LOWER(announcement.content) LIKE :content', { content: `%${content.trim().toLowerCase()}%` })
    }

    if (email?.trim()) {
      qb.andWhere('LOWER(announcement.email) LIKE :email', { email: `%${email.trim().toLowerCase()}%` })
    }

    if (phone_number?.trim()) {
      qb.andWhere('announcement.phone_number LIKE :phone_number', { phone_number: `%${phone_number.trim()}%` })
    }

    if (full_name?.trim()) {
      const normalizedName = removeVietnameseTones(full_name).toLowerCase().trim()
      qb.andWhere('(user.full_name_normalized LIKE :normalizedName OR LOWER(user.full_name) LIKE :rawName)', {
        normalizedName: `%${normalizedName}%`,
        rawName: `%${full_name.trim().toLowerCase()}%`,
      })
    }

    if (from_date?.trim()) {
      const fromDateObj = new Date(from_date.trim())
      if (!isNaN(fromDateObj.getTime())) {
        qb.andWhere('announcement.created_at >= :fromDate', { fromDate: fromDateObj })
      }
    }

    if (to_date?.trim()) {
      const rawTo = to_date.trim()
      const toDateObj = new Date(rawTo)
      if (!isNaN(toDateObj.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawTo)) {
          toDateObj.setHours(23, 59, 59, 999)
        }
        qb.andWhere('announcement.created_at <= :toDate', { toDate: toDateObj })
      }
    }

    if (!orderBy) {
      qb.orderBy('announcement.id', orderDirection || 'DESC')
    }

    const { data, meta } = await paginate(qb, {
      page,
      limit,
      orderBy,
      orderDirection,
      anotherOrderBy,
    })

    return {
      data: data.map(item => this.formatAnnouncement(item as AnnouncementStation & { user?: User })),
      meta,
    }
  }

  async getAnnouncementById(id: number) {
    const announcement = (await this.announcementStationRepository
      .createQueryBuilder('announcement')
      .withDeleted()
      .leftJoinAndMapOne('announcement.user', User, 'user', 'user.id = announcement.user_id')
      .where('announcement.id = :id', { id })
      .getOne()) as (AnnouncementStation & { user?: User }) | null

    if (!announcement) {
      throwAppException('ANNOUNCEMENT_NOT_FOUND', ErrorCode.ANNOUNCEMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    let smsJob = null
    if (announcement.sms_job_uid) {
      try {
        smsJob = await this.smsGatewayService.getJobByIdOrUid(announcement.sms_job_uid)
      } catch {
        smsJob = null
      }
    }

    return {
      ...this.formatAnnouncement(announcement),
      sms_job: smsJob,
    }
  }

  private formatAnnouncement(item: AnnouncementStation & { user?: User }) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      file_url: item.file_url,
      role: item.role,
      type: item.type,
      status: item.status,
      target_id: item.target_id,
      user_id: item.user_id,
      email: item.email,
      phone_number: item.phone_number,
      sms_job_uid: item.sms_job_uid,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user: item.user
        ? {
            id: item.user.id,
            code: item.user.code,
            saint_name: item.user.saint_name,
            full_name: item.user.full_name,
            email: item.user.email,
            phone_number: item.user.phone_number,
            avatar: item.user.avatar,
          }
        : null,
    }
  }

  async sendAnnouncement(announcementDto: AnnouncementDto) {
    const { role, userIds, title, content, file_url, type = AnnouncementType.EMAIL } = announcementDto

    let recipients: { target_id: number; user_id: number; email?: string; phone_number?: string }[] = []

    if (role === Role.STUDENT) {
      const students = await this.studentRepository
        .createQueryBuilder('student')
        .select(['student.id', 'student.user_id', 'user.email', 'user.phone_number'])
        .where('student.id IN (:...userIds)', { userIds })
        .leftJoin('student.user', 'user')
        .getMany()
      recipients = students.map(s => ({
        target_id: s.id,
        user_id: s.user_id,
        email: s.user?.email,
        phone_number: s.user?.phone_number,
      }))
    } else if (role === Role.TEACHER) {
      const teachers = await this.teacherRepository
        .createQueryBuilder('teacher')
        .select(['teacher.id', 'teacher.user_id', 'user.email', 'user.phone_number'])
        .where('teacher.id IN (:...userIds)', { userIds })
        .leftJoin('teacher.user', 'user')
        .getMany()
      recipients = teachers.map(t => ({
        target_id: t.id,
        user_id: t.user_id,
        email: t.user?.email,
        phone_number: t.user?.phone_number,
      }))
    } else {
      throwAppException('ONLY_STUDENT_OR_TEACHER', ErrorCode.ONLY_STUDENT_OR_TEACHER, HttpStatus.BAD_REQUEST)
    }

    const validEmails = recipients.map(r => r.email).filter((email): email is string => Boolean(email) && !email.includes('@example.com'))

    if (type === AnnouncementType.EMAIL && !validEmails.length) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    const validPhones = recipients
      .map(r => r.phone_number?.trim())
      .filter((phone): phone is string => Boolean(phone) && /^\+?[0-9\s\-().]{3,20}$/.test(phone))

    if (type === AnnouncementType.SMS && !validPhones.length) {
      throwAppException('NO_PHONE_NUMBER_FOUND', ErrorCode.NO_PHONE_NUMBER_FOUND, HttpStatus.BAD_REQUEST)
    }

    // Khi chọn gửi bằng SMS thì không cần dùng file_url
    const normalizedFileUrls = type === AnnouncementType.SMS ? [] : file_url || []

    // Trong sendAnnouncement: nếu announcementDto.file_url là array url -> gợi ý hiển thị trong content (chỉ cho EMAIL)
    const attachmentsHtml =
      type !== AnnouncementType.SMS && normalizedFileUrls.length
        ? `<p>File đính kèm:</p><ul>${normalizedFileUrls.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
        : ''

    const fullContent = `${content || ''}${attachmentsHtml}`

    // Lưu từng người nhận thành 1 dòng (row) trong database với status PENDING ban đầu
    const records = recipients.map(r =>
      this.announcementStationRepository.create({
        title,
        content,
        file_url: normalizedFileUrls,
        role,
        type,
        status: AnnouncementStatus.PENDING,
        target_id: r.target_id,
        user_id: r.user_id,
        email: r.email,
        phone_number: r.phone_number?.trim() || null,
      }),
    )
    const savedRecords = await this.announcementStationRepository.save(records)
    const savedIds = savedRecords.map(r => r.id)

    if (type === AnnouncementType.EMAIL) {
      try {
        await this.emailService.sendMail(
          validEmails.map(email => ({ email, name: email })),
          title,
          null,
          null,
          null,
          fullContent,
        )
        if (savedIds.length) {
          await this.announcementStationRepository.update({ id: In(savedIds) }, { status: AnnouncementStatus.SUBMITTED })
        }
      } catch (error) {
        if (savedIds.length) {
          await this.announcementStationRepository.update({ id: In(savedIds) }, { status: AnnouncementStatus.FAILED })
        }
        throw error
      }
    } else if (type === AnnouncementType.SMS) {
      const smsMessage = this.buildSmsMessageText(title, content)

      for (const record of savedRecords) {
        const phone = record.phone_number?.trim()
        if (!phone || !/^\+?[0-9\s\-().]{3,20}$/.test(phone)) {
          await this.announcementStationRepository.update({ id: record.id }, { status: AnnouncementStatus.FAILED })
          continue
        }

        const smsJob = await this.smsGatewayService.enqueueSms({
          recipient: phone,
          message: smsMessage,
          idempotency_key: `announcement-station-${record.id}`,
          metadata: {
            source: 'announcement_station',
            announcementId: record.id,
            targetId: record.target_id,
            userId: record.user_id,
            role: record.role,
          },
        })

        await this.announcementStationRepository.update(
          { id: record.id },
          {
            sms_job_uid: smsJob.job_uid,
          },
        )
        await this.smsGatewayService.syncAnnouncementStatusForJob(smsJob, smsJob.status)
      }
    }
  }

  private buildSmsMessageText(title?: string, content?: string): string {
    const cleanTitle = (title || '').trim()
    const cleanContent = (content || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()

    if (cleanTitle && cleanContent && cleanTitle !== cleanContent) {
      return `${cleanTitle}\n${cleanContent}`.slice(0, 1500)
    }
    return (cleanContent || cleanTitle).slice(0, 1500)
  }
}
