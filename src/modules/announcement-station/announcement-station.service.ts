import { throwAppException } from '@common/utils'
import { AnnouncementStatus, AnnouncementType } from '@enums/announcement.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { AnnouncementDto } from '@modules/announcement-station/dtos/announcement.dto'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { In, Repository } from 'typeorm'

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
  ) {}

  async sendAnnouncement(announcementDto: AnnouncementDto) {
    const { role, userIds, title, content, file_url, type = AnnouncementType.EMAIL } = announcementDto

    let recipients: { target_id: number; user_id: number; email?: string }[] = []

    if (role === Role.STUDENT) {
      const students = await this.studentRepository
        .createQueryBuilder('student')
        .select(['student.id', 'student.user_id', 'user.email'])
        .where('student.id IN (:...userIds)', { userIds })
        .leftJoin('student.user', 'user')
        .getMany()
      recipients = students.map(s => ({
        target_id: s.id,
        user_id: s.user_id,
        email: s.user?.email,
      }))
    } else if (role === Role.TEACHER) {
      const teachers = await this.teacherRepository
        .createQueryBuilder('teacher')
        .select(['teacher.id', 'teacher.user_id', 'user.email'])
        .where('teacher.id IN (:...userIds)', { userIds })
        .leftJoin('teacher.user', 'user')
        .getMany()
      recipients = teachers.map(t => ({
        target_id: t.id,
        user_id: t.user_id,
        email: t.user?.email,
      }))
    } else {
      throwAppException('ONLY_STUDENT_OR_TEACHER', ErrorCode.ONLY_STUDENT_OR_TEACHER, HttpStatus.BAD_REQUEST)
    }

    const validEmails = recipients
      .map(r => r.email)
      .filter((email): email is string => Boolean(email) && !email.includes('@example.com'))

    if (type === AnnouncementType.EMAIL && !validEmails.length) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    // Trong sendAnnouncement: nếu announcementDto.file_url là array url -> gợi ý hiển thị trong content
    const attachmentsHtml =
      file_url && file_url.length ? `<p>File đính kèm:</p><ul>${file_url.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>` : ''

    const fullContent = `${content || ''}${attachmentsHtml}`

    // Lưu từng người nhận thành 1 dòng (row) trong database với status PENDING ban đầu
    const records = recipients.map(r =>
      this.announcementStationRepository.create({
        title,
        content,
        file_url: file_url || [],
        role,
        type,
        status: AnnouncementStatus.PENDING,
        target_id: r.target_id,
        user_id: r.user_id,
        email: r.email,
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
          await this.announcementStationRepository.update(
            { id: In(savedIds) },
            { status: AnnouncementStatus.SUBMITTED },
          )
        }
      } catch (error) {
        if (savedIds.length) {
          await this.announcementStationRepository.update(
            { id: In(savedIds) },
            { status: AnnouncementStatus.FAILED },
          )
        }
        throw error
      }
    }
  }
}
