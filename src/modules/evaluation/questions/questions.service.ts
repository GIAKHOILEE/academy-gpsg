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
import { PaginateQuestionsDto } from './dtos/pagiante-questions.dto'
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

  async statisticQuestion(questionId: number) {
    const question = await this.questionsRepository.findOne({
      where: { id: questionId },
    })

    if (!question) {
      throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
        return this.statisticSingleChoice(questionId)

      case QuestionType.MULTIPLE_CHOICE:
        return this.statisticMultipleChoice(questionId)

      case QuestionType.NUMBER:
        return this.statisticNumber(questionId)

      case QuestionType.TEXT:
        return this.statisticText(questionId)
    }
  }

  // thống kê Single Choice
  async statisticSingleChoice(questionId: number) {
    const raw = await this.answersRepository
      .createQueryBuilder('answer')
      .select('answer.answer_single_choice', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('answer.question_id = :questionId', { questionId })
      .andWhere('answer.answer_single_choice IS NOT NULL')
      .groupBy('answer.answer_single_choice')
      .getRawMany()

    const totalAll = raw.reduce((sum, r) => sum + Number(r.total), 0)

    return raw.map(r => ({
      optionIndex: Number(r.value),
      total: Number(r.total),
      percent: Number(((r.total / totalAll) * 100).toFixed(2)),
    }))
  }

  // thống kê Multiple Choice
  async statisticMultipleChoice(questionId: number) {
    const raw = await this.answersRepository.query(
      `
    SELECT jt.value as value, COUNT(*) as total
    FROM answers a,
    JSON_TABLE(a.answer_multiple_choice, '$[*]' 
      COLUMNS (value INT PATH '$')
    ) as jt
    WHERE a.question_id = ?
    GROUP BY jt.value
  `,
      [questionId],
    )

    const totalAll = raw.reduce((sum, r) => sum + Number(r.total), 0)

    return raw.map(r => ({
      optionIndex: Number(r.value),
      total: Number(r.total),
      percent: Number(((r.total / totalAll) * 100).toFixed(2)),
    }))
  }

  // thống kê Number
  async statisticNumber(questionId: number) {
    const raw = await this.answersRepository
      .createQueryBuilder('a')
      .select('a.answer_number', 'value')
      .addSelect('COUNT(*)', 'total')
      .where('a.question_id = :questionId', { questionId })
      .groupBy('a.answer_number')
      .getRawMany()

    const totalAll = raw.reduce((sum, r) => sum + Number(r.total), 0)

    return raw.map(r => ({
      value: Number(r.value),
      total: Number(r.total),
      percent: Number(((r.total / totalAll) * 100).toFixed(2)),
    }))
  }

  // thống kê Text
  async statisticText(questionId: number) {
    return this.answersRepository.find({
      where: { question_id: questionId },
      select: ['answer_text'],
    })
  }
}
