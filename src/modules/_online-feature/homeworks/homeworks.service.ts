// src/modules/homework/homework.service.ts
import { Injectable, NotFoundException, BadRequestException, HttpStatus } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Homeworks } from './entities/homeworks.entity'
import { HomeworkQuestion } from './entities/question.entity'
import { HomeworkOption } from './entities/option.entity'
import { CreateHomeworksDto } from './dtos/create-homeworks.dto'
import { Lesson } from '../lesson/lesson.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { HomeworkSubmission } from './entities/submission.entity'
import { HomeworkAnswer } from './entities/answer.entity'
import { PaginateHomeworksDto } from './dtos/paginate-homeworks.dto'
import { paginate } from '@common/pagination'
import { IHomework } from './homeworks.interface'

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homeworks)
    private hwRepo: Repository<Homeworks>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(HomeworkSubmission)
    private submissionRepo: Repository<HomeworkSubmission>,
    @InjectRepository(HomeworkAnswer)
    private answerRepo: Repository<HomeworkAnswer>,
    private dataSource: DataSource,
  ) {}

  async createHomework(createDto: CreateHomeworksDto) {
    const lesson = await this.lessonRepo.findOne({ where: { id: createDto.lesson_id } })
    if (!lesson) throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const hwRepo = queryRunner.manager.getRepository(Homeworks)
      const questionRepo = queryRunner.manager.getRepository(HomeworkQuestion)
      const optionRepo = queryRunner.manager.getRepository(HomeworkOption)

      // tạo bài
      const newHw = hwRepo.create({
        title: createDto.title,
        description: createDto.description,
        lesson: lesson,
        total_points: createDto.questions.reduce((sum, q) => sum + q.points, 0),
      })

      const savedHw = await hwRepo.save(newHw)

      // tạo questions + options
      for (const qDto of createDto.questions) {
        const newQuestion = questionRepo.create({
          homework: savedHw,
          content: qDto.content,
          type: qDto.type,
          points: qDto.points,
        })
        const savedQ = await questionRepo.save(newQuestion)

        if (Array.isArray(qDto.options)) {
          for (const oDto of qDto.options) {
            const newOption = optionRepo.create({
              question: savedQ,
              content: oDto.content,
              is_correct: oDto.is_correct,
            })
            await optionRepo.save(newOption)
          }
        }
      }

      await queryRunner.commitTransaction()

      // trả về bài vừa tạo (với relations)
      const result = await this.hwRepo.findOne({
        where: { id: savedHw.id },
        relations: ['questions', 'questions.options', 'lesson'],
      })

      return result
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async updateHomework(homeworkId: number, updateDto: CreateHomeworksDto) {
    const hw = await this.hwRepo.findOne({ where: { id: homeworkId }, relations: ['questions', 'questions.options', 'lesson'] })
    if (!hw) throwAppException('HOMEWORK_NOT_FOUND', ErrorCode.HOMEWORK_NOT_FOUND, HttpStatus.NOT_FOUND)

    const lesson = await this.lessonRepo.findOne({ where: { id: updateDto.lesson_id } })
    if (!lesson) throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)

    try {
      // kiểm tra có submission và answer nào không
      const hasSubmissions = await this.submissionRepo.exists({ where: { homework: { id: hw.id } } })
      const hasAnswers = await this.answerRepo.exists({ where: { submission: { homework: { id: hw.id } } } })

      // nếu không có submission và answer thì xóa toàn bộ homework
      if (!hasSubmissions && !hasAnswers) {
        await this.hwRepo.delete(hw.id)
        // gọi hàm createHomework tạo lại mới hoàn toàn
        return this.createHomework(updateDto)
      } else {
        // nếu có submission và answer thì không được cập nhật
        throwAppException('HOMEWORK_HAS_SUBMISSIONS', ErrorCode.HOMEWORK_HAS_SUBMISSIONS, HttpStatus.BAD_REQUEST)
      }
    } catch (err) {
      throw err
    }
  }

  async getManyHomeworks(paginateHomeworksDto: PaginateHomeworksDto) {
    const { lesson_id, ...rest } = paginateHomeworksDto
    const queryBuilder = this.hwRepo
      .createQueryBuilder('homework')
      .leftJoin('homework.lesson', 'lesson')
      .leftJoin('homework.questions', 'questions')
      .leftJoin('questions.options', 'options')
      .select([
        'homework.id',
        'homework.title',
        'homework.description',
        'homework.total_points',
        'lesson.id',
        'lesson.title',
        'lesson.schedule',
        'lesson.start_time',
        'lesson.end_time',
        'questions.id',
        'questions.content',
        'questions.type',
        'questions.points',
        'options.id',
        'options.content',
        'options.is_correct',
      ])

    if (lesson_id) {
      const lessonExists = await this.lessonRepo.exists({ where: { id: lesson_id } })
      if (!lessonExists) {
        throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      queryBuilder.where('lesson.id = :lesson_id', { lesson_id })
    }

    const { data, meta } = await paginate(queryBuilder, rest)

    const formattedHomeworks: IHomework[] = data.map(homework => {
      return {
        id: homework.id,
        title: homework.title,
        description: homework.description,
        total_points: homework.total_points,
        lesson: {
          id: homework.lesson.id,
          title: homework.lesson.title,
          schedule: homework.lesson.schedule,
          start_time: homework.lesson.start_time,
          end_time: homework.lesson.end_time,
        },
        questions: homework.questions.map(question => {
          return {
            id: question.id,
            content: question.content,
            type: question.type,
            points: question.points,
            options: question.options.map(option => {
              return {
                id: option.id,
                content: option.content,
                is_correct: option.is_correct,
              }
            }),
          }
        }),
      }
    })

    return { data: formattedHomeworks, meta }
  }

  async getHomeworkById(id: number) {
    const homework = await this.hwRepo
      .createQueryBuilder('homework')
      .leftJoin('homework.lesson', 'lesson')
      .leftJoin('homework.questions', 'questions')
      .leftJoin('questions.options', 'options')
      .select([
        'homework.id',
        'homework.title',
        'homework.description',
        'homework.total_points',
        'lesson.id',
        'lesson.title',
        'lesson.schedule',
        'lesson.start_time',
        'lesson.end_time',
        'questions.id',
        'questions.content',
        'questions.type',
        'questions.points',
        'options.id',
        'options.content',
        'options.is_correct',
      ])
      .where('homework.id = :id', { id })
      .getOne()

    if (!homework) throwAppException('HOMEWORK_NOT_FOUND', ErrorCode.HOMEWORK_NOT_FOUND, HttpStatus.NOT_FOUND)
    return homework
  }
}
