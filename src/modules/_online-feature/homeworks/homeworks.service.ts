import { Injectable, HttpStatus } from '@nestjs/common'
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
import { SubmitHomeworkDto } from './dtos/submit-homework.dto'
import { Student } from '@modules/students/students.entity'
import { QuestionType, SubmissionStatus } from '@enums/homework.enum'

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
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
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
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
        // throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
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

  async submitHomework(studentId: number, submitDto: SubmitHomeworkDto) {
    // validate entities
    const student = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const hw = await this.hwRepo.findOne({
      where: { id: submitDto.homework_id },
      relations: ['questions', 'questions.options'],
    })
    if (!hw) throwAppException('HOMEWORK_NOT_FOUND', ErrorCode.HOMEWORK_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (!Array.isArray(submitDto.answers) || submitDto.answers.length === 0) {
      throwAppException('ANSWERS_REQUIRED', ErrorCode.ANSWERS_REQUIRED, HttpStatus.BAD_REQUEST)
    }

    // build map questionId -> question
    const qMap = new Map<number, HomeworkQuestion>()
    for (const q of hw.questions || []) qMap.set(q.id, q)

    // validate payload questions exist and types
    for (const ansPayload of submitDto.answers) {
      const q = qMap.get(ansPayload.questionId)
      if (!q) throwAppException('QUESTION_NOT_BELONG_TO_HOMEWORK', ErrorCode.QUESTION_NOT_BELONG_TO_HOMEWORK, HttpStatus.BAD_REQUEST)

      if (q.type === QuestionType.ESSAY) {
        if (!ansPayload.answer_text) {
          throwAppException('QUESTION_REQUIRES_ANSWER_TEXT', ErrorCode.QUESTION_REQUIRES_ANSWER_TEXT, HttpStatus.BAD_REQUEST)
        }
      } else {
        // MCQ types: require selected_option_ids array
        if (!Array.isArray(ansPayload.selected_option_ids) || ansPayload.selected_option_ids.length === 0) {
          throwAppException('QUESTION_REQUIRES_SELECTED_OPTION_IDS', ErrorCode.QUESTION_REQUIRES_SELECTED_OPTION_IDS, HttpStatus.BAD_REQUEST)
        }
        // optional: check that selected option ids belong to q.options
        const optIds = (q.options || []).map(o => o.id)
        for (const id of ansPayload.selected_option_ids) {
          if (!optIds.includes(id)) {
            throwAppException('OPTION_NOT_BELONG_TO_QUESTION', ErrorCode.OPTION_NOT_BELONG_TO_QUESTION, HttpStatus.BAD_REQUEST)
          }
        }
      }
    }

    // start transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const subRepo = queryRunner.manager.getRepository(HomeworkSubmission)
      const ansRepo = queryRunner.manager.getRepository(HomeworkAnswer)

      // create submission
      const submission = subRepo.create({
        homework: hw,
        student,
        score: 0,
        status: SubmissionStatus.PENDING,
      })
      const savedSub = await subRepo.save(submission)

      // create answers
      const createdAnswers: HomeworkAnswer[] = []
      for (const a of submitDto.answers) {
        const q = qMap.get(a.questionId)
        const newAns = ansRepo.create({
          submission: savedSub,
          question: q,
          selected_option_ids: a.selected_option_ids ?? null,
          answer_text: a.answer_text ?? null,
          score: 0,
        })
        const savedAns = await ansRepo.save(newAns)
        createdAnswers.push(savedAns)
      }

      // auto-grade MCQ answers
      let totalScore = 0
      for (const ans of createdAnswers) {
        const q = qMap.get(ans.question.id)
        if (!q) continue
        if (q.type === QuestionType.ESSAY) {
          // leave score 0 for teacher to grade
          continue
        }

        const opts = q.options || []
        const correctIds = opts.filter(o => o.is_correct).map(o => o.id)
        const selected: number[] = Array.isArray(ans.selected_option_ids) ? ans.selected_option_ids : []

        if (q.type === QuestionType.MCQ_SINGLE) {
          const isCorrect = selected.length === 1 && correctIds.includes(selected[0])
          ans.score = isCorrect ? Number(q.points) : 0
        } else {
          // MCQ_MULTI -> partial credit (correct chosen / correct total), no penalty
          const correctChosen = selected.filter(id => correctIds.includes(id)).length
          const portion = correctIds.length ? correctChosen / correctIds.length : 0
          ans.score = Number(q.points) * Math.max(0, portion)
        }
        totalScore += Number(ans.score || 0)
        await ansRepo.save(ans)
      }

      // determine if there are any essay questions -> if none, mark AUTO_GRADED
      const hasEssay = hw.questions.some(q => q.type === QuestionType.ESSAY)
      if (!hasEssay) {
        // all auto graded
        const sumQuestionPoints = hw.total_points ?? (hw.questions.reduce((s, q) => s + Number(q.points || 0), 0) || 1)
        const percent = (totalScore / sumQuestionPoints) * 100

        savedSub.score = Number(totalScore)
        savedSub.status = SubmissionStatus.AUTO_GRADED
        ;(savedSub as any).percent = percent // if you have percent column; else compute on client
        await subRepo.save(savedSub)
      } else {
        // partial score recorded for MCQ answers; submission.status remains PENDING
        savedSub.score = Number(totalScore)
        await subRepo.save(savedSub)
      }

      await queryRunner.commitTransaction()
      await queryRunner.release()

      // return submission with relations (use normal repo to fetch)
      const result = await this.submissionRepo.findOne({
        where: { id: savedSub.id },
        relations: ['homework', 'answers', 'answers.question', 'answers.question.options', 'student'],
      })
      return result
    } catch (err) {
      try {
        await queryRunner.rollbackTransaction()
      } catch (e) {
        // ignore rollback error but log if needed
      }
      await queryRunner.release()
      throw err
    }
  }
}
