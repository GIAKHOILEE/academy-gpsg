import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Exam } from './exam.entity'
import { CreateExamDto } from './dtos/create-exam.dto'
import { UpdateExamDto } from './dtos/update-exam.dto'
import { PaginateExamDto } from './dtos/paginate-exam.dto'
import { IExam } from './exam.interface'
import { Classes } from '@modules/class/class.entity'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { ExamScore } from '../exam-scores/exam-scores.entity'
import { paginate, PaginationMeta } from '@common/pagination'

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(ExamScore)
    private readonly examScoresRepository: Repository<ExamScore>,
  ) {}

  async createExam(createExamDto: CreateExamDto): Promise<IExam> {
    const { class_id, weight_percentage } = createExamDto
    const classEntity = await this.classRepository.findOne({ where: { id: class_id } })
    if (!classEntity) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    // kiểm tra tỷ lệ trọng số của đề kiểm tra
    if (weight_percentage > 100) {
      throwAppException('WEIGHT_PERCENTAGE_MUST_BE_LESS_THAN_100', ErrorCode.WEIGHT_PERCENTAGE_MUST_BE_LESS_THAN_100, HttpStatus.BAD_REQUEST)
    }
    // kiểm tra tỷ lệ trọng số của đề kiểm tra
    if (weight_percentage < 0) {
      throwAppException('WEIGHT_PERCENTAGE_MUST_BE_GREATER_THAN_0', ErrorCode.WEIGHT_PERCENTAGE_MUST_BE_GREATER_THAN_0, HttpStatus.BAD_REQUEST)
    }
    // kiểm tra trọng số tất cả đề kiểm tra của lớp
    const exams = await this.examRepository.find({ where: { class_id }, select: ['weight_percentage'] })
    const totalWeight = exams.reduce((acc, exam) => acc + exam.weight_percentage, 0)
    if (totalWeight + weight_percentage > 100) {
      throwAppException('TOTAL_WEIGHT_MUST_BE_LESS_THAN_100', ErrorCode.TOTAL_WEIGHT_MUST_BE_LESS_THAN_100, HttpStatus.BAD_REQUEST)
    }

    const exam = this.examRepository.create({
      ...createExamDto,
      class: classEntity,
    })
    const savedExam = await this.examRepository.save(exam)
    const formattedExam: IExam = {
      id: savedExam.id,
      name: savedExam.name,
      weight_percentage: savedExam.weight_percentage,
      class_id: savedExam.class_id,
    }
    return formattedExam
  }

  async updateExam(id: number, updateExamDto: UpdateExamDto): Promise<void> {
    const { class_id, weight_percentage } = updateExamDto
    const examEntity = await this.examRepository.findOne({ where: { id } })
    if (!examEntity) {
      throwAppException('EXAM_NOT_FOUND', ErrorCode.EXAM_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (class_id) {
      const classEntity = await this.classRepository.findOne({ where: { id: class_id } })
      if (!classEntity) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
    }

    if (weight_percentage) {
      if (weight_percentage > 100) {
        throwAppException('WEIGHT_PERCENTAGE_MUST_BE_LESS_THAN_100', ErrorCode.WEIGHT_PERCENTAGE_MUST_BE_LESS_THAN_100, HttpStatus.BAD_REQUEST)
      }
      if (weight_percentage < 0) {
        throwAppException('WEIGHT_PERCENTAGE_MUST_BE_GREATER_THAN_0', ErrorCode.WEIGHT_PERCENTAGE_MUST_BE_GREATER_THAN_0, HttpStatus.BAD_REQUEST)
      }

      const exams = await this.examRepository.find({ where: { class_id }, select: ['weight_percentage'] })
      const totalWeight = exams.reduce((acc, exam) => acc + exam.weight_percentage, 0)
      if (totalWeight + weight_percentage > 100) {
        throwAppException('TOTAL_WEIGHT_MUST_BE_LESS_THAN_100', ErrorCode.TOTAL_WEIGHT_MUST_BE_LESS_THAN_100, HttpStatus.BAD_REQUEST)
      }
    }

    await this.examRepository.update(id, updateExamDto)
  }

  async deleteExam(id: number): Promise<void> {
    const examExists = await this.examRepository.exists({ where: { id } })
    if (!examExists) {
      throwAppException('EXAM_NOT_FOUND', ErrorCode.EXAM_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const examScoresExists = await this.examScoresRepository.exists({ where: { exam_id: id } })
    if (examScoresExists) {
      throwAppException('EXAM_HAS_SCORES', ErrorCode.EXAM_HAS_SCORES, HttpStatus.BAD_REQUEST)
    }
    await this.examRepository.delete(id)
  }

  async getExamById(id: number): Promise<IExam> {
    const examEntity = await this.examRepository.findOne({ where: { id } })
    if (!examEntity) {
      throwAppException('EXAM_NOT_FOUND', ErrorCode.EXAM_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedExam: IExam = {
      id: examEntity.id,
      name: examEntity.name,
      weight_percentage: examEntity.weight_percentage,
      class_id: examEntity.class_id,
    }
    return formattedExam
  }

  async getExams(paginateExamDto: PaginateExamDto): Promise<{ data: IExam[]; meta: PaginationMeta }> {
    const { class_id, ...rest } = paginateExamDto
    const query = this.examRepository.createQueryBuilder('exam')
    if (class_id) {
      query.where('exam.class_id = :class_id', { class_id })
    }

    const { data, meta } = await paginate(query, rest)
    const formattedData: IExam[] = data.map((exam: Exam) => ({
      id: exam.id,
      name: exam.name,
      weight_percentage: exam.weight_percentage,
      class_id: exam.class_id,
    }))
    return { data: formattedData, meta }
  }
}
