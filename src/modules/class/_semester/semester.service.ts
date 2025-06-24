import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

import { Semester } from './semester.entity'
import { CreateSemesterDto } from './dtos/create-semester.dto'
import { UpdateSemesterDto } from './dtos/update-semester.dto'
import { PaginateSemesterDto } from './dtos/paginate-semester.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { Classes } from '../class.entity'

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
      throw new BadRequestException('SEMESTER_ALREADY_EXISTS')
    }
    const newSemester = this.semesterRepository.create(createSemesterDto)
    return await this.semesterRepository.save(newSemester)
  }

  async update(id: number, updateSemesterDto: UpdateSemesterDto): Promise<void> {
    const semester = await this.semesterRepository.exists({ where: { id } })
    if (!semester) {
      throw new NotFoundException('SEMESTER_NOT_FOUND')
    }
    const existingSemester = await this.semesterRepository.exists({ where: { name: updateSemesterDto.name } })
    if (existingSemester) throw new BadRequestException('SEMESTER_ALREADY_EXISTS')

    await this.semesterRepository.update(id, updateSemesterDto)
  }

  async delete(id: number): Promise<void> {
    const semester = await this.semesterRepository.exists({ where: { id } })
    if (!semester) throw new NotFoundException('SEMESTER_NOT_FOUND')

    const classes = await this.classRepository.exists({ where: { semester_id: id } })
    if (classes) throw new BadRequestException('SEMESTER_HAS_CLASSES')

    await this.semesterRepository.delete(id)
  }

  async findAll(paginateSemesterDto: PaginateSemesterDto): Promise<{ data: Semester[]; meta: PaginationMeta }> {
    const queryBuilder = this.semesterRepository.createQueryBuilder('semester')

    const { data, meta } = await paginate(queryBuilder, paginateSemesterDto)
    return { data, meta }
  }

  async findOne(id: number): Promise<Semester> {
    const semester = await this.semesterRepository.findOne({ where: { id } })
    if (!semester) throw new NotFoundException('SEMESTER_NOT_FOUND')

    return semester
  }
}
