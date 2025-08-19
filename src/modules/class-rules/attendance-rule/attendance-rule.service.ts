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
}
