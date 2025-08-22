import { HttpStatus, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm/repository/Repository'
import { AttendanceRule } from './attendance-rule.entity'
import { CreateAttendanceRuleDto } from './dtos/create-attendance-rule.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Classes } from '@modules/class/class.entity'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { IAttendanceRule } from './attendance-rule.interface'
import { UpdateAttendanceRuleDto } from './dtos/update-attendance-rule.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateAttendanceRuleDto } from './dtos/paginate-attendance-rule.dto'
import { IClasses } from '@modules/class/class.interface'
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm'

@Injectable()
export class AttendanceRuleService {
  constructor(
    @InjectRepository(AttendanceRule)
    private readonly attendanceRuleRepository: Repository<AttendanceRule>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
  ) {}

  async createAttendanceRule(class_id: number, createAttendanceRuleDto: CreateAttendanceRuleDto[]): Promise<IAttendanceRule[]> {
    const classExist = await this.classRepository.findOne({ where: { id: class_id } })
    if (!classExist) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    // const existingAttendanceRule = await this.attendanceRuleRepository.findOne({ where: { class_id } })
    // if (existingAttendanceRule) throwAppException('ATTENDANCE_RULE_ALREADY_EXISTS', ErrorCode.ATTENDANCE_RULE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    // Tạo nhiều rule 1 lần
    const attendanceRules = this.attendanceRuleRepository.create(
      createAttendanceRuleDto.map(dto => ({
        ...dto,
        class: classExist,
      })),
    )
    const newAttendanceRule = await this.attendanceRuleRepository.save(attendanceRules)

    const formattedAttendanceRule: IAttendanceRule[] = newAttendanceRule.map(attendanceRule => ({
      id: attendanceRule.id,
      class_id: attendanceRule.class_id,
      lesson_date: attendanceRule.lesson_date,
      card_start_time: attendanceRule.card_start_time,
      card_end_time: attendanceRule.card_end_time,
      type: attendanceRule.type,
    }))
    return formattedAttendanceRule
  }

  async updateAttendanceRule(class_id: number, updateAttendanceRuleDto: UpdateAttendanceRuleDto[]): Promise<void> {
    // xóa hết rule cũ của class
    await this.attendanceRuleRepository.delete({ class_id })

    // tạo mới
    await this.createAttendanceRule(class_id, updateAttendanceRuleDto)
  }

  // async deleteAttendanceRule(id: number): Promise<void> {
  //   const attendanceRule = await this.attendanceRuleRepository.exists({ where: { id } })
  //   if (!attendanceRule) throwAppException('ATTENDANCE_RULE_NOT_FOUND', ErrorCode.ATTENDANCE_RULE_NOT_FOUND, HttpStatus.NOT_FOUND)

  //   await this.attendanceRuleRepository.delete(id)
  // }

  async getAllAttendanceRule(paginateAttendanceRuleDto: PaginateAttendanceRuleDto): Promise<{ data: IAttendanceRule[]; meta: PaginationMeta }> {
    const queryBuilder = await this.attendanceRuleRepository.createQueryBuilder('attendance_rule')

    const { data, meta } = await paginate(queryBuilder, paginateAttendanceRuleDto)

    const formattedAttendanceRule: IAttendanceRule[] = data.map(attendanceRule => ({
      id: attendanceRule.id,
      class_id: attendanceRule.class_id,
      lesson_date: attendanceRule.lesson_date,
      card_start_time: attendanceRule.card_start_time,
      card_end_time: attendanceRule.card_end_time,
      type: attendanceRule.type,
    }))
    return { data: formattedAttendanceRule, meta }
  }

  async getDetailAttendanceRule(id: number): Promise<IAttendanceRule> {
    const attendanceRule = await this.attendanceRuleRepository.findOne({ where: { id } })
    if (!attendanceRule) throwAppException('ATTENDANCE_RULE_NOT_FOUND', ErrorCode.ATTENDANCE_RULE_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedAttendanceRule: IAttendanceRule = {
      id: attendanceRule.id,
      class_id: attendanceRule.class_id,
      lesson_date: attendanceRule.lesson_date,
      card_start_time: attendanceRule.card_start_time,
      card_end_time: attendanceRule.card_end_time,
      type: attendanceRule.type,
    }
    return formattedAttendanceRule
  }

  // Lấy danh sách lớp đang trong thời gian điểm danh
  async getTodayAttendanceClass(): Promise<IClasses[]> {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Lấy giờ phút hiện tại (HH:mm)
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // "HH:mm"

    const rules = await this.attendanceRuleRepository.find({
      where: {
        lesson_date: today,
        card_start_time: LessThanOrEqual(currentTime),
        card_end_time: MoreThanOrEqual(currentTime),
      },
    })

    const classIds = rules.map(r => r.class_id)
    if (classIds.length === 0) return []

    const classes = await this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('subject.department', 'department')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')
      .where('classes.id IN (:...classIds)', { classIds })
      .getMany()

    const formattedClasses: IClasses[] = classes.map(classEntity => ({
      id: classEntity.id,
      name: classEntity?.subject?.name,
      code: classEntity.code,
      image: classEntity.subject.image,
      status: classEntity.status,
      number_lessons: classEntity.number_lessons,
      classroom: classEntity.classroom,
      credit: classEntity.subject.credit,
      max_students: classEntity.max_students,
      price: classEntity.price,
      schedule: classEntity.schedule,
      condition: classEntity.condition,
      end_enrollment_day: classEntity.end_enrollment_day,
      start_time: classEntity.start_time,
      end_time: classEntity.end_time,
      opening_day: classEntity.opening_day,
      closing_day: classEntity.closing_day,
      subject: classEntity?.subject
        ? {
            id: classEntity.subject.id,
            code: classEntity.subject.code,
            name: classEntity.subject.name,
            credit: classEntity.subject.credit,
            image: classEntity.subject.image,
            post_link: classEntity.subject.post_link,
          }
        : null,
      teacher: classEntity?.teacher
        ? {
            id: classEntity.teacher.id,
            code: classEntity.teacher.user.code,
            full_name: classEntity.teacher.user.full_name,
            saint_name: classEntity.teacher.user.saint_name,
            email: classEntity.teacher.user.email,
            other_name: classEntity.teacher.other_name,
          }
        : null,
      scholastic: classEntity?.scholastic
        ? {
            id: classEntity.scholastic.id,
            name: classEntity.scholastic.name,
          }
        : null,
      semester: classEntity?.semester
        ? {
            id: classEntity.semester.id,
            name: classEntity.semester.name,
          }
        : null,
      department: classEntity.subject?.department
        ? {
            id: classEntity.subject.department.id,
            code: classEntity.subject.department.code,
            name: classEntity.subject.department.name,
          }
        : null,
    }))

    return formattedClasses
  }
}
