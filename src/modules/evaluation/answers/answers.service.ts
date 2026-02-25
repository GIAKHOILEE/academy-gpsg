import { HttpStatus, Injectable } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Answers } from './answers.entity'
import { CreateAnswersDto } from './dtos/create-answers.dto'
import { IAnswers } from './answers.interface'
import { Questions } from '../questions/questions.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { PaginateAnswersDto } from './dtos/paginate-answers.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answers)
    private readonly answersRepository: Repository<Answers>,
    @InjectRepository(Questions)
    private readonly questionsRepository: Repository<Questions>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
  ) {}

  async createAnswers(answersDto: CreateAnswersDto, userId: number): Promise<void> {
    // exit class_id, semester_id, scholastic_id from answersDto
    const { class_id } = answersDto
    const classExist = await this.classRepository
      .createQueryBuilder('class')
      .select(['class.id', 'class.semester_id', 'class.scholastic_id'])
      .where('class.id = :id', { id: class_id })
      .getOne()
    if (!classExist) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    // get student_id from user_id
    const student = await this.studentRepository.findOne({ where: { user_id: userId } })
    if (!student) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // mỗi câu hỏi chỉ được trả lời 1 lần
    const answersExist = await this.answersRepository
      .createQueryBuilder('answers')
      .where('answers.class_id = :class_id', { class_id })
      .andWhere('answers.student_id = :student_id', { student_id: student.id })
      .andWhere('answers.question_id IN (:...questionIds)', { questionIds: answersDto.answers.map(answer => answer.question_id) })
      .getMany()
    if (answersExist.length > 0) {
      throwAppException('JUST_ONE_ANSWER_PER_QUESTION', ErrorCode.JUST_ONE_ANSWER_PER_QUESTION, HttpStatus.BAD_REQUEST)
    }

    // get question_id in answers
    const questionIds = answersDto.answers.map(answer => answer.question_id)
    const questions = await this.questionsRepository.count({ where: { id: In(questionIds) } })
    if (questions !== questionIds.length) {
      throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // create answers
    const answers = answersDto.answers.map(answer => ({
      question_id: answer.question_id,
      answer_text: answer?.answer_text,
      answer_number: answer?.answer_number,
      answer_single_choice: answer?.answer_single_choice,
      answer_multiple_choice: answer?.answer_multiple_choice,
      class_id: class_id,
      student_id: student.id,
      semester_id: classExist.semester_id,
      scholastic_id: classExist.scholastic_id,
    }))
    await this.answersRepository.save(answers)
  }

  //   async updateAnswers(answersDto: UpdateAnswersDto[], id: number): Promise<IAnswers> {
  //     const answers = await this.answersRepository.findOne({ where: { id } })
  //     if (!answers) {
  //       throwAppException('ANSWER_NOT_FOUND', ErrorCode.ANSWER_NOT_FOUND, HttpStatus.NOT_FOUND)
  //     }

  //     const newAnswers = this.answersRepository.create({ ...answers, ...answersDto })
  //     return this.answersRepository.save(newAnswers)
  //   }

  async getAnswers(paginateAnswersDto: PaginateAnswersDto): Promise<{ data: IAnswers[]; meta: PaginationMeta }> {
    const query = this.answersRepository
      .createQueryBuilder('answers')
      .select([
        'answers.id',
        'answers.student_id',
        'answers.class_id',
        'answers.semester_id',
        'answers.scholastic_id',
        'answers.answer_text',
        'answers.answer_number',
        'answers.answer_single_choice',
        'answers.answer_multiple_choice',
        'question.id',
        'question.question',
        'question.type',
        'student.id',
        'user.full_name',
        'user.saint_name',
        'user.code',
      ])
      .leftJoin('answers.question', 'question')
      .leftJoin('answers.student', 'student')
      .leftJoin('student.user', 'user')

    const { data, meta } = await paginate(query, paginateAnswersDto)

    // group by student_id + class_id
    const map = new Map()

    for (const answer of data) {
      const key = `${answer.student_id}_${answer.class_id}`

      if (!map.has(key)) {
        map.set(key, {
          class_id: answer.class_id,
          student_id: answer.student_id,
          semester_id: answer.semester_id,
          scholastic_id: answer.scholastic_id,
          student: {
            id: answer.student.id,
            full_name: answer.student.user.full_name,
            saint_name: answer.student.user.saint_name,
            code: answer.student.user.code,
          },
          answers: [],
        })
      }

      // push answer vào đúng student_id + class_id
      map.get(key).answers.push({
        id: answer.id,
        question: {
          id: answer.question.id,
          question: answer.question.question,
          type: answer.question.type,
        },
        answer_text: answer.answer_text,
        answer_number: answer.answer_number,
        answer_single_choice: answer.answer_single_choice,
        answer_multiple_choice: answer.answer_multiple_choice,
      })
    }
    return { data: Array.from(map.values()), meta }
  }
}
