import { paginate, PaginationDto, PaginationMeta } from '@common/pagination'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateSubjectDto } from './dtos/create-subject.dto'
import { Subject } from './subjects.entity'
import { ISubject } from './subjects.interface'
import { UpdateSubjectDto } from './dtos/update-subject.dto'

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto): Promise<ISubject> {
    const { name, image, description } = createSubjectDto

    const existingSubject = await this.subjectRepository.findOne({ where: { name } })
    if (existingSubject) {
      throw new BadRequestException('Subject already exists')
    }

    const subject = this.subjectRepository.create({ name, image, description })
    return this.subjectRepository.save(subject)
  }

  async getAll(pagination: PaginationDto): Promise<{ data: ISubject[]; meta: PaginationMeta }> {
    const queryBuilder = this.subjectRepository.createQueryBuilder('subject').select(['subject.id', 'subject.name', 'subject.image'])
    const { data, meta } = await paginate(queryBuilder, pagination)

    return { data, meta }
  }

  async getById(id: number): Promise<ISubject> {
    const subject = await this.subjectRepository.findOne({ where: { id } })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }
    const formattedSubject = {
      id: subject.id,
      name: subject.name,
      image: subject.image,
      description: subject.description,
    }
    return formattedSubject
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto): Promise<void> {
    const subject = await this.subjectRepository.findOne({ where: { id } })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    if (updateSubjectDto.name) {
      const existingSubject = await this.subjectRepository
        .createQueryBuilder('subject')
        .where('subject.name = :name', { name: updateSubjectDto.name })
        .andWhere('subject.id != :id', { id })
        .getOne()

      if (existingSubject) {
        throw new BadRequestException('Subject already exists')
      }
    }

    await this.subjectRepository.update(id, updateSubjectDto)
  }

  async delete(id: number): Promise<void> {
    const subject = await this.subjectRepository.findOne({ where: { id } })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }
    await this.subjectRepository.delete(id)
  }
}
