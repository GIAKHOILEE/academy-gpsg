import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { AnnouncementDto } from '@modules/announcement-station/dtos/announcement.dto'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { Repository } from 'typeorm'

@Injectable()
export class AnnouncementStationService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    private readonly emailService: BrevoMailerService,
  ) {}

  async sendAnnouncement(announcementDto: AnnouncementDto) {
    const { role, userIds, title, content } = announcementDto

    let emails: string[] = []

    if (role === Role.STUDENT) {
      const students = await this.studentRepository
        .createQueryBuilder('student')
        .select(['student.id', 'student.user_id', 'user.email'])
        .where('student.id IN (:...userIds)', { userIds })
        .leftJoin('student.user', 'user')
        .getMany()
      emails = students.map(s => s.user?.email).filter(Boolean)
    } else if (role === Role.TEACHER) {
      const teachers = await this.teacherRepository
        .createQueryBuilder('teacher')
        .select(['teacher.id', 'teacher.user_id', 'user.email'])
        .where('teacher.id IN (:...userIds)', { userIds })
        .leftJoin('teacher.user', 'user')
        .getMany()
      emails = teachers.map(t => t.user?.email).filter(Boolean)
    } else {
      throwAppException('ONLY_STUDENT_OR_TEACHER', ErrorCode.ONLY_STUDENT_OR_TEACHER, HttpStatus.BAD_REQUEST)
    }

    if (!emails.length) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    // nếu mail có @example.com thì bỏ qua
    emails = emails.filter(email => !email.includes('@example.com'))

    await this.emailService.sendMail(
      emails.map(email => ({ email, name: email })),
      title,
      null,
      null,
      null,
      content,
    )
  }
}
