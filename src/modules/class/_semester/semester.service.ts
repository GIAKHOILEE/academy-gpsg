import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Classes } from '../class.entity'
import { CreateSemesterDto } from './dtos/create-semester.dto'
import { PaginateSemesterDto } from './dtos/paginate-semester.dto'
import { UpdateSemesterDto } from './dtos/update-semester.dto'
import { Semester } from './semester.entity'

@Injectable()
export class SemesterService {
  constructor(
    @InjectRepository(Semester)
    private readonly semesterRepository: Repository<Semester>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
  ) {}

  async create(createSemesterDto: CreateSemesterDto): Promise<Semester> {
    const semester = await this.semesterRepository.findOne({
      where: {
        name: createSemesterDto.name,
      },
    })
    if (semester) {
      throwAppException('SEMESTER_ALREADY_EXISTS', ErrorCode.SEMESTER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }
    const newSemester = this.semesterRepository.create(createSemesterDto)
    return await this.semesterRepository.save(newSemester)
  }

  async update(id: number, updateSemesterDto: UpdateSemesterDto): Promise<void> {
    const semester = await this.semesterRepository.exists({ where: { id } })
    if (!semester) {
      throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const existingSemester = await this.semesterRepository.exists({ where: { name: updateSemesterDto.name } })
    if (existingSemester) throwAppException('SEMESTER_ALREADY_EXISTS', ErrorCode.SEMESTER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    await this.semesterRepository.update(id, updateSemesterDto)
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const semester = await this.semesterRepository.exists({ where: { id } })
    if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.semesterRepository.update(id, { index })
  }

  async delete(id: number): Promise<void> {
    const semester = await this.semesterRepository.exists({ where: { id } })
    if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classes = await this.classRepository.exists({ where: { semester_id: id } })
    if (classes) throwAppException('SEMESTER_HAS_CLASSES', ErrorCode.SEMESTER_HAS_CLASSES, HttpStatus.BAD_REQUEST)

    await this.semesterRepository.delete(id)
  }

  async findAll(paginateSemesterDto: PaginateSemesterDto): Promise<{ data: Semester[]; meta: PaginationMeta }> {
    const queryBuilder = this.semesterRepository.createQueryBuilder('semester')

    const { data, meta } = await paginate(queryBuilder, paginateSemesterDto)
    return { data, meta }
  }

  async findOne(id: number): Promise<Semester> {
    const semester = await this.semesterRepository.findOne({ where: { id } })
    if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)

    return semester
  }
}
