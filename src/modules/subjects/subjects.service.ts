import { paginate, PaginationDto, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateSubjectDto } from './dtos/create-subject.dto'
import { UpdateSubjectDto } from './dtos/update-subject.dto'
import { Subject } from './subjects.entity'
import { ISubject } from './subjects.interface'
import { Classes } from '@modules/class/class.entity'

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto): Promise<ISubject> {
    const { code, name, image, description } = createSubjectDto

    const existingCode = await this.subjectRepository.findOne({ where: { code: createSubjectDto.code } })
    if (existingCode) {
      throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const existingSubject = await this.subjectRepository.findOne({ where: { name } })
    if (existingSubject) {
      throwAppException('SUBJECT_ALREADY_EXISTS', ErrorCode.SUBJECT_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const subject = this.subjectRepository.create({ code, name, image, description })
    return this.subjectRepository.save(subject)
  }

  async getAll(pagination: PaginationDto): Promise<{ data: ISubject[]; meta: PaginationMeta }> {
    const queryBuilder = this.subjectRepository.createQueryBuilder('subject').select(['subject.id', 'subject.code', 'subject.name', 'subject.image'])
    const { data, meta } = await paginate(queryBuilder, pagination)

    const formattedData = data.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      image: subject.image,
      description: subject.description,
    }))
    return { data: formattedData, meta }
  }

  async getById(id: number): Promise<ISubject> {
    const subject = await this.subjectRepository.findOne({ where: { id } })
    if (!subject) {
      throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedSubject = {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      image: subject.image,
      description: subject.description,
    }
    return formattedSubject
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto): Promise<void> {
    const subject = await this.subjectRepository.findOne({ where: { id } })
    if (!subject) {
      throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (updateSubjectDto.code) {
      const existingCode = await this.subjectRepository
        .createQueryBuilder('subject')
        .where('subject.code = :code', { code: updateSubjectDto.code })
        .andWhere('subject.id != :id', { id })
        .getOne()

      if (existingCode) {
        throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }

    if (updateSubjectDto.name) {
      const existingSubject = await this.subjectRepository
        .createQueryBuilder('subject')
        .where('subject.name = :name', { name: updateSubjectDto.name })
        .andWhere('subject.id != :id', { id })
        .getOne()

      if (existingSubject) {
        throwAppException('SUBJECT_ALREADY_EXISTS', ErrorCode.SUBJECT_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }

      // sửa tên lớp
      await this.classRepository.update({ subject_id: id }, { name: updateSubjectDto.name })
    }

    await this.subjectRepository.update(id, updateSubjectDto)
  }

  async delete(id: number): Promise<void> {
    const subject = await this.subjectRepository.exists({ where: { id } })
    if (!subject) {
      throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    // môn học mà đang có lớp thì không được xóa
    const classSubject = await this.classRepository.exists({ where: { subject_id: id } })
    if (classSubject) {
      throwAppException('SUBJECT_HAS_CLASS', ErrorCode.SUBJECT_HAS_CLASS, HttpStatus.BAD_REQUEST)
    }
    await this.subjectRepository.delete(id)
  }
}
