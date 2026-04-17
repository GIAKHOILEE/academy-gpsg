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
    const { class_id, page = 1, limit = 10 } = dto

    let targetClassIds: number[] = []
    let total = 0

    const classQuery = this.answersRepository
      .createQueryBuilder('a')
      .select('a.class_id', 'class_id')
      .distinct(true)

    if (class_id) {
      targetClassIds = [Number(class_id)]
      total = 1
    } else {
      const rawClasses = await classQuery.getRawMany()
      total = rawClasses.length
      const paginatedClasses = rawClasses.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit))
      targetClassIds = paginatedClasses.map(c => Number(c.class_id))
    }

    const meta: PaginationMeta = {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    }

    if (targetClassIds.length === 0) {
      return { data: [], meta }
    }

    // Prepare query for Single Choice
    const qSingle = this.answersRepository
      .createQueryBuilder('a')
      .select('a.class_id', 'class_id')
      .addSelect('a.question_id', 'question_id')
      .addSelect('a.answer_single_choice', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('a.answer_single_choice IS NOT NULL')
      .andWhere('a.class_id IN (:...targetClassIds)', { targetClassIds })

    qSingle.groupBy('a.class_id').addGroupBy('a.question_id').addGroupBy('a.answer_single_choice')
    const rawSingle = await qSingle.getRawMany()

    // Prepare query for Multiple Choice
    const placeholders = targetClassIds.map(() => '?').join(',')
    let mcQuery = `
      SELECT a.class_id as class_id, a.question_id as question_id, jt.value as value, COUNT(*) as total
      FROM answers a,
      JSON_TABLE(a.answer_multiple_choice, '$[*]' COLUMNS (value INT PATH '$')) as jt
      WHERE a.class_id IN (${placeholders})
      GROUP BY a.class_id, a.question_id, jt.value
    `
    const mcParams = [...targetClassIds]
    const rawMultiple = await this.answersRepository.query(mcQuery, mcParams)

    // Prepare query for Number
    const qNumber = this.answersRepository
      .createQueryBuilder('a')
      .select('a.class_id', 'class_id')
      .addSelect('a.question_id', 'question_id')
      .addSelect('a.answer_number', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('a.answer_number IS NOT NULL')
      .andWhere('a.class_id IN (:...targetClassIds)', { targetClassIds })

    qNumber.groupBy('a.class_id').addGroupBy('a.question_id').addGroupBy('a.answer_number')
    const rawNumber = await qNumber.getRawMany()

    // Prepare query for Text
    const qText = this.answersRepository
      .createQueryBuilder('a')
      .select('a.class_id', 'class_id')
      .addSelect('a.question_id', 'question_id')
      .addSelect('a.answer_text', 'value')
      .where('a.answer_text IS NOT NULL')
      .andWhere('a.class_id IN (:...targetClassIds)', { targetClassIds })

    const rawText = await qText.getRawMany()

    // Retrieve active questions to know their type
    const questionsList = await this.questionsRepository.find({ select: ['id', 'type'] })
    const questionTypeMap = new Map<number, QuestionType>(questionsList.map(q => [q.id, q.type]))

    // Data structure to hold everything
    // resultByClass: class_id -> Map<question_id, any>
    const resultByClass = new Map<number, Map<number, any>>()

    const getGroup = (cId: number, qId: number) => {
      if (!resultByClass.has(cId)) resultByClass.set(cId, new Map())
      const qMap = resultByClass.get(cId)!
      if (!qMap.has(qId)) qMap.set(qId, { questionId: qId, totalAll: 0, options: [], answers: [] })
      return qMap.get(qId)
    }

    // Process Single Choice
    rawSingle.forEach(r => {
      const qId = Number(r.question_id)
      const group = getGroup(Number(r.class_id), qId)
      group.type = questionTypeMap.get(qId) || QuestionType.SINGLE_CHOICE
      const total = Number(r.total)
      group.totalAll += total
      group.options.push({ value: r.value, total })
    })

    // Process Multiple Choice
    rawMultiple.forEach(r => {
      const qId = Number(r.question_id)
      const group = getGroup(Number(r.class_id), qId)
      group.type = questionTypeMap.get(qId) || QuestionType.MULTIPLE_CHOICE
      const total = Number(r.total)
      group.totalAll += total
      group.options.push({ value: r.value, total })
    })

    // Process Number
    rawNumber.forEach(r => {
      const qId = Number(r.question_id)
      const group = getGroup(Number(r.class_id), qId)
      group.type = questionTypeMap.get(qId) || QuestionType.NUMBER
      const total = Number(r.total)
      group.totalAll += total
      group.options.push({ value: r.value, total })
    })

    // Process Text
    rawText.forEach(r => {
      const qId = Number(r.question_id)
      const group = getGroup(Number(r.class_id), qId)
      group.type = questionTypeMap.get(qId) || QuestionType.TEXT
      group.answers.push(r.value)
    })

    // Format final response
    const finalResult = []

    for (const cId of targetClassIds) {
      const questionsData = []
      const qMap = resultByClass.get(cId) || new Map()

      for (const question of questionsList) {
        const qId = question.id
        const data = qMap.get(qId) || {
          questionId: qId,
          totalAll: 0,
          options: [],
          answers: [],
        }

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

        questionsData.push({
          questionId: qId,
          type: qType,
          statistics: stats,
        })
      }

      finalResult.push({
        class_id: cId,
        questions: questionsData,
      })
    }

    return { data: finalResult, meta }
  }
}
