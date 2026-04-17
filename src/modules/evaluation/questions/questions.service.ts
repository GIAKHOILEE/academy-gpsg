import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Questions } from './questions.entity'
import { CreateQuestionsDto } from './dtos/create-questions.dto'
import { IQuestion } from './questions.interface'
import { UpdateQuestionsDto } from './dtos/update-questions.dto'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Answers } from '../answers/answers.entity'
import { PaginateQuestionsDto, PaginateQuestionsStatisticsDto } from './dtos/pagiante-questions.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { QuestionType } from '@enums/evaluation.enum'

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Questions)
    private readonly questionsRepository: Repository<Questions>,
    @InjectRepository(Answers)
    private readonly answersRepository: Repository<Answers>,
  ) {}

  async createQuestion(question: CreateQuestionsDto): Promise<IQuestion> {
    const { options, type } = question

    // nếu type là single choice hoặc multiple choice thì options là mảng string
    if (type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE) {
      if (!options || options.length === 0) {
        throwAppException('OPTIONS_REQUIRED', ErrorCode.OPTIONS_REQUIRED, HttpStatus.BAD_REQUEST)
      }
    }
    // type = text thì options là null
    if (type === QuestionType.TEXT) {
      if (options) {
        throwAppException('OPTIONS_NOT_ALLOWED_FOR_TEXT', ErrorCode.OPTIONS_NOT_ALLOWED_FOR_TEXT, HttpStatus.BAD_REQUEST)
      }
    }
    // type = number thì options null
    if (type === QuestionType.NUMBER) {
      if (options) {
        throwAppException('OPTIONS_NOT_ALLOWED_FOR_NUMBER', ErrorCode.OPTIONS_NOT_ALLOWED_FOR_NUMBER, HttpStatus.BAD_REQUEST)
      }
    }

    const newQuestion = this.questionsRepository.create(question)
    return this.questionsRepository.save(newQuestion)
  }

  async updateQuestion(id: number, question: UpdateQuestionsDto): Promise<void> {
    const questionEntity = await this.questionsRepository.findOne({ where: { id } })
    if (!questionEntity) {
      throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const exitAnswer = await this.answersRepository.findOne({ where: { question_id: id } })
    if (exitAnswer && question.type !== questionEntity.type) {
      throwAppException('QUESTION_HAS_ANSWER_NOT_CHANGE_TYPE', ErrorCode.QUESTION_HAS_ANSWER_NOT_CHANGE_TYPE, HttpStatus.BAD_REQUEST)
    }

    // nếu type là single choice hoặc multiple choice thì options là mảng string
    if (question.type && (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE)) {
      if (!question.options || question.options.length === 0) {
        throwAppException('OPTIONS_REQUIRED', ErrorCode.OPTIONS_REQUIRED, HttpStatus.BAD_REQUEST)
      }
    }

    await this.questionsRepository.update(id, question)
  }

  async deleteQuestion(id: number): Promise<void> {
    const exitQuestion = await this.questionsRepository.exists({ where: { id } })
    if (!exitQuestion) {
      throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.questionsRepository.delete(id)
  }

  async paginateQuestions(paginateQuestionsDto: PaginateQuestionsDto): Promise<{ data: IQuestion[]; meta: PaginationMeta }> {
    const query = this.questionsRepository.createQueryBuilder('question')
    const { data, meta } = await paginate(query, paginateQuestionsDto)
    const formattedData = data.map(question => ({
      id: question.id,
      question: question.question,
      options: question.options,
      type: question.type,
    }))
    return { data: formattedData, meta }
  }

  async getQuestionById(id: number): Promise<IQuestion> {
    const question = await this.questionsRepository.findOne({ where: { id } })
    if (!question) {
      throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return question
  }
}

// thống kê
export class QuestionsStatisticsService {
  constructor(
    @InjectRepository(Questions)
    private readonly questionsRepository: Repository<Questions>,
    @InjectRepository(Answers)
    private readonly answersRepository: Repository<Answers>,
  ) {}

  async statisticQuestion(dto: PaginateQuestionsStatisticsDto) {
    const { class_id, ...paginateParams } = dto
    const cId = Number(class_id)

    // 1. Paginate Questions instead of Classes
    const questionQuery = this.questionsRepository.createQueryBuilder('q')
    const { data: questionsList, meta } = await paginate(questionQuery, paginateParams as any)
    const targetQuestionIds = questionsList.map(q => q.id)

    if (targetQuestionIds.length === 0) {
      return { data: { class_id: cId, questions: [] }, meta }
    }

    // 2. Fetch statistics ONLY for current page's questions and the specified class
    // Single Choice
    const qSingle = this.answersRepository
      .createQueryBuilder('a')
      .select('a.question_id', 'question_id')
      .addSelect('a.answer_single_choice', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('a.class_id = :cId', { cId })
      .andWhere('a.question_id IN (:...targetQuestionIds)', { targetQuestionIds })
      .andWhere('a.answer_single_choice IS NOT NULL')
      .groupBy('a.question_id').addGroupBy('a.answer_single_choice')
    const rawSingle = await qSingle.getRawMany()

    // Multiple Choice
    const placeholders = targetQuestionIds.map(() => '?').join(',')
    let mcQuery = `
      SELECT a.question_id as question_id, jt.value as value, COUNT(*) as total
      FROM answers a,
      JSON_TABLE(a.answer_multiple_choice, '$[*]' COLUMNS (value INT PATH '$')) as jt
      WHERE a.class_id = ? AND a.question_id IN (${placeholders})
      GROUP BY a.question_id, jt.value
    `
    const mcParams = [cId, ...targetQuestionIds]
    const rawMultiple = await this.answersRepository.query(mcQuery, mcParams)

    // Number
    const qNumber = this.answersRepository
      .createQueryBuilder('a')
      .select('a.question_id', 'question_id')
      .addSelect('a.answer_number', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('a.class_id = :cId', { cId })
      .andWhere('a.question_id IN (:...targetQuestionIds)', { targetQuestionIds })
      .andWhere('a.answer_number IS NOT NULL')
      .groupBy('a.question_id').addGroupBy('a.answer_number')
    const rawNumber = await qNumber.getRawMany()

    // Text
    const qText = this.answersRepository
      .createQueryBuilder('a')
      .select('a.question_id', 'question_id')
      .addSelect('a.answer_text', 'value')
      .where('a.class_id = :cId', { cId })
      .andWhere('a.question_id IN (:...targetQuestionIds)', { targetQuestionIds })
      .andWhere('a.answer_text IS NOT NULL')
    const rawText = await qText.getRawMany()

    // 3. Process data into a map for easy lookup
    const questionStatsMap = new Map<number, any>()
    const getGroup = (qId: number) => {
      if (!questionStatsMap.has(qId)) {
        questionStatsMap.set(qId, { totalAll: 0, options: [], answers: [] })
      }
      return questionStatsMap.get(qId)
    }

    rawSingle.forEach(r => {
      const g = getGroup(Number(r.question_id))
      const total = Number(r.total)
      g.totalAll += total
      g.options.push({ value: r.value, total })
    })

    rawMultiple.forEach(r => {
      const g = getGroup(Number(r.question_id))
      const total = Number(r.total)
      g.totalAll += total
      g.options.push({ value: r.value, total })
    })

    rawNumber.forEach(r => {
      const g = getGroup(Number(r.question_id))
      const total = Number(r.total)
      g.totalAll += total
      g.options.push({ value: r.value, total })
    })

    rawText.forEach(r => {
      const g = getGroup(Number(r.question_id))
      g.answers.push(r.value)
    })

    // 4. Format the final response
    const formattedQuestions = questionsList.map(question => {
      const qId = question.id
      const data = questionStatsMap.get(qId) || { totalAll: 0, options: [], answers: [] }
      let stats = []
      const qType = question.type

      if (qType === QuestionType.SINGLE_CHOICE || qType === QuestionType.MULTIPLE_CHOICE) {
        stats = data.options.map(opt => ({
          optionIndex: Number(opt.value),
          total: opt.total,
          percent: data.totalAll > 0 ? Number(((opt.total / data.totalAll) * 100).toFixed(2)) : 0,
        }))
      } else if (qType === QuestionType.NUMBER) {
        stats = data.options.map(opt => ({
          value: Number(opt.value),
          total: opt.total,
          percent: data.totalAll > 0 ? Number(((opt.total / data.totalAll) * 100).toFixed(2)) : 0,
        }))
      } else if (qType === QuestionType.TEXT) {
        stats = data.answers || []
      }

      return {
        questionId: qId,
        question: question.question,
        type: qType,
        statistics: stats,
      }
    })

    return {
      data: {
        class_id: cId,
        questions: formattedQuestions,
      },
      meta,
    }
  }
}
