import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { ClassRule } from './class-rules.entity'
import { CreateClassRulesDto } from './dtos/create-class-rules.dto'
import { UpdateClassRulesDto } from './dtos/update-class-rules.dto'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Classes } from '@modules/class/class.entity'
import { RuleType } from '@enums/class.enum'
import { IClassRule } from './class-rules.interface'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateClassRulesDto } from './dtos/paginate-class-rules.dto'

@Injectable()
export class ClassRulesService {
  constructor(
    @InjectRepository(ClassRule)
    private classRulesRepository: Repository<ClassRule>,
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
  ) {}

  async createClassRules(createClassRulesDto: CreateClassRulesDto): Promise<IClassRule> {
    const { class_id, type, attendance_percent, score } = createClassRulesDto

    const classEntity = await this.classRepository.exists({ where: { id: class_id } })
    if (!classEntity) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const classRule = await this.classRulesRepository.findOne({ where: { class_id } })
    if (classRule) {
      throwAppException('CLASS_RULE_ALREADY_EXISTS', ErrorCode.CLASS_RULE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    if (type === RuleType.ATTENDANCE_PERCENTAGE || type === RuleType.ATTENDANCE_PERCENTAGE_AND_SCORE_BASED) {
      if (!attendance_percent) {
        throwAppException('ATTENDANCE_PERCENTAGE_IS_REQUIRED', ErrorCode.ATTENDANCE_PERCENTAGE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
      }
      if (attendance_percent > 1 || attendance_percent < 0) {
        throwAppException(
          'ATTENDANCE_PERCENTAGE_MUST_BE_BETWEEN_0_AND_1',
          ErrorCode.ATTENDANCE_PERCENTAGE_MUST_BE_BETWEEN_0_AND_1,
          HttpStatus.BAD_REQUEST,
        )
      }
    }

    if (type === RuleType.SCORE_BASED || type === RuleType.ATTENDANCE_PERCENTAGE_AND_SCORE_BASED) {
      if (!score) {
        throwAppException('SCORE_IS_REQUIRED', ErrorCode.SCORE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
      }
    }

    const classRules = this.classRulesRepository.create(createClassRulesDto)
    const savedClassRules = await this.classRulesRepository.save(classRules)

    const formattedClassRules: IClassRule = {
      id: savedClassRules.id,
      class_id: savedClassRules.class_id,
      type: savedClassRules.type,
      attendance_percent: savedClassRules.attendance_percent,
      score: savedClassRules.score,
      description: savedClassRules.description,
    }
    return formattedClassRules
  }

  async updateClassRules(id: number, updateClassRulesDto: UpdateClassRulesDto): Promise<void> {
    const { class_id, type, attendance_percent, score } = updateClassRulesDto
    const classRules = await this.classRulesRepository
      .createQueryBuilder('class_rules')
      .select([
        'class_rules.id',
        'class_rules.class_id',
        'class_rules.type',
        'class_rules.attendance_percent',
        'class_rules.score',
        'class_rules.description',
      ])
      .where('class_rules.id = :id', { id })
      .getOne()
    if (!classRules) {
      throwAppException('CLASS_RULE_NOT_FOUND', ErrorCode.CLASS_RULE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (class_id) {
      const classEntity = await this.classRepository.exists({ where: { id: class_id } })
      if (!classEntity) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      const classRule = await this.classRulesRepository.findOne({ where: { class_id, id: Not(id) } })
      if (classRule) {
        throwAppException('CLASS_RULE_ALREADY_EXISTS', ErrorCode.CLASS_RULE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
      classRules.class_id = class_id
    }

    if (type) {
      if (type === RuleType.ATTENDANCE_PERCENTAGE || type === RuleType.ATTENDANCE_PERCENTAGE_AND_SCORE_BASED) {
        if (!attendance_percent) {
          throwAppException('ATTENDANCE_PERCENTAGE_IS_REQUIRED', ErrorCode.ATTENDANCE_PERCENTAGE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
        }
      }
      if (type === RuleType.SCORE_BASED || type === RuleType.ATTENDANCE_PERCENTAGE_AND_SCORE_BASED) {
        if (!score) {
          throwAppException('SCORE_IS_REQUIRED', ErrorCode.SCORE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
        }
      }
    }

    await this.classRulesRepository.update(id, updateClassRulesDto)
  }

  async deleteClassRules(id: number): Promise<void> {
    const classRules = await this.classRulesRepository.exists({ where: { id } })
    if (!classRules) {
      throwAppException('CLASS_RULE_NOT_FOUND', ErrorCode.CLASS_RULE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.classRulesRepository.delete(id)
  }

  async getClassRulesByClassId(class_id: number): Promise<IClassRule> {
    const classRules = await this.classRulesRepository.findOne({ where: { class_id } })
    if (!classRules) {
      throwAppException('CLASS_RULE_NOT_FOUND', ErrorCode.CLASS_RULE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedClassRules: IClassRule = {
      id: classRules.id,
      class_id: classRules.class_id,
      type: classRules.type,
      attendance_percent: classRules.attendance_percent,
      score: classRules.score,
      description: classRules.description,
    }
    return formattedClassRules
  }

  async getAllClassRules(paginateClassRulesDto: PaginateClassRulesDto): Promise<{ data: IClassRule[]; meta: PaginationMeta }> {
    const { class_id, ...rest } = paginateClassRulesDto
    const query = this.classRulesRepository.createQueryBuilder('class_rules')
    if (class_id) {
      query.where('class_rules.class_id = :class_id', { class_id })
    }

    const { data, meta } = await paginate(query, rest)
    const formattedClassRules: IClassRule[] = data.map((classRule: ClassRule) => ({
      id: classRule.id,
      class_id: classRule.class_id,
      type: classRule.type,
      attendance_percent: classRule.attendance_percent,
      score: classRule.score,
      description: classRule.description,
    }))
    return { data: formattedClassRules, meta }
  }
}
