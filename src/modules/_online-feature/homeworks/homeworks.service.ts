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
import { PaginateHomeworksDto, PaginateSubmissionsDto } from './dtos/paginate-homeworks.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { IHomework, IHomeworkSubmission } from './homeworks.interface'
import { SubmitHomeworkDto } from './dtos/submit-homework.dto'
import { Student } from '@modules/students/students.entity'
import { QuestionTypeHomework, SubmissionStatus } from '@enums/homework.enum'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { GradeSubmissionDto } from './dtos/submission-grade.dto'

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
    @InjectRepository(ClassStudents)
    private classStudentRepo: Repository<ClassStudents>,
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
        deadline_date: createDto.deadline_date,
        deadline_time: createDto.deadline_time,
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
        'homework.deadline_date',
        'homework.deadline_time',
        'homework.total_points',
        'lesson.id',
        'lesson.title',
        'lesson.schedule',
        'lesson.start_date',
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
        deadline_date: homework.deadline_date,
        deadline_time: homework.deadline_time,
        total_points: homework.total_points,
        lesson: {
          id: homework.lesson.id,
          title: homework.lesson.title,
          schedule: homework.lesson.schedule,
          start_date: homework.lesson.start_date,
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
        'homework.deadline_date',
        'homework.deadline_time',
        'homework.total_points',
        'lesson.id',
        'lesson.title',
        'lesson.schedule',
        'lesson.start_date',
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

  async submitHomework(userId: number, submitDto: SubmitHomeworkDto) {
    // validate entities
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } })
    if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    // nếu đã submit bài thì không được submit lại
    const hasSubmission = await this.submissionRepo.exists({ where: { homework: { id: submitDto.homework_id }, student: { user: { id: userId } } } })
    if (hasSubmission) throwAppException('HOMEWORK_ALREADY_SUBMITTED', ErrorCode.HOMEWORK_ALREADY_SUBMITTED, HttpStatus.BAD_REQUEST)

    const hw = await this.hwRepo
      .createQueryBuilder('homework')
      .leftJoinAndSelect('homework.lesson', 'lesson')
      .leftJoinAndSelect('homework.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
      .leftJoinAndSelect('lesson.class', 'class')
      .where('homework.id = :id', { id: submitDto.homework_id })
      .getOne()

    console.log(hw)
    // kiểm tra student có trong lớp không
    const classStudent = await this.classStudentRepo.findOne({ where: { student: { user: { id: userId } }, class: { id: hw.lesson.class.id } } })
    if (!classStudent) throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)

    if (!hw) throwAppException('HOMEWORK_NOT_FOUND', ErrorCode.HOMEWORK_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (!Array.isArray(submitDto.answers) || submitDto.answers.length === 0) {
      throwAppException('ANSWERS_REQUIRED', ErrorCode.ANSWERS_REQUIRED, HttpStatus.BAD_REQUEST)
    }

    // build map questionId -> question (dùng để lấy question từ questionId)
    const qMap = new Map<number, HomeworkQuestion>()
    for (const q of hw.questions || []) qMap.set(q.id, q)

    // validate các câu hỏi có tồn tại và loại câu hỏi
    for (const ansPayload of submitDto.answers) {
      const q = qMap.get(ansPayload.question_id)
      if (!q) throwAppException('QUESTION_NOT_BELONG_TO_HOMEWORK', ErrorCode.QUESTION_NOT_BELONG_TO_HOMEWORK, HttpStatus.BAD_REQUEST)

      if (q.type === QuestionTypeHomework.ESSAY) {
        if (!ansPayload.answer_text) {
          throwAppException('QUESTION_REQUIRES_ANSWER_TEXT', ErrorCode.QUESTION_REQUIRES_ANSWER_TEXT, HttpStatus.BAD_REQUEST)
        }
      } else if (q.type === QuestionTypeHomework.FILE) {
        if (!ansPayload.file) {
          throwAppException('QUESTION_REQUIRES_FILE', ErrorCode.QUESTION_REQUIRES_FILE, HttpStatus.BAD_REQUEST)
        }
      } else {
        // MCQ types: yêu cầu mảng selected_option_ids
        if (!Array.isArray(ansPayload.selected_option_ids) || ansPayload.selected_option_ids.length === 0) {
          throwAppException('QUESTION_REQUIRES_SELECTED_OPTION_IDS', ErrorCode.QUESTION_REQUIRES_SELECTED_OPTION_IDS, HttpStatus.BAD_REQUEST)
        }

        // Nếu là single-select mà chọn nhiều option -> lỗi
        if (q.type === QuestionTypeHomework.MCQ_SINGLE && ansPayload.selected_option_ids.length > 1) {
          throwAppException('MCQ_SINGLE_ONLY_ONE_OPTION_ALLOWED', ErrorCode.MCQ_SINGLE_ONLY_ONE_OPTION_ALLOWED, HttpStatus.BAD_REQUEST)
        }

        // optional: kiểm tra option id có thuộc câu hỏi không
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
        const q = qMap.get(a.question_id)
        const newAns = ansRepo.create({
          submission: savedSub,
          question: q,
          selected_option_ids: a.selected_option_ids ?? null,
          answer_text: a.answer_text ?? null,
          file: a.file ?? null,
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
        if (q.type === QuestionTypeHomework.ESSAY) {
          // leave score 0 for teacher to grade
          continue
        }

        const opts = q.options || []
        const correctIds = opts.filter(o => o.is_correct).map(o => o.id)
        const selected: number[] = Array.isArray(ans.selected_option_ids) ? ans.selected_option_ids : []

        if (q.type === QuestionTypeHomework.MCQ_SINGLE) {
          const isCorrect = selected.length === 1 && correctIds.includes(selected[0])
          ans.score = isCorrect ? Number(q.points) : 0
        } else {
          // MCQ_MULTI -> điểm từng câu (correct chosen / correct total), không có phạt
          const correctChosen = selected.filter(id => correctIds.includes(id)).length
          const portion = correctIds.length ? correctChosen / correctIds.length : 0
          ans.score = Number(q.points) * Math.max(0, portion)
        }
        totalScore += Number(ans.score || 0)
        await ansRepo.save(ans)
      }

      // kiểm tra có câu hỏi essay không -> nếu không có thì đánh dấu AUTO_GRADED
      const hasEssay = hw.questions.some(q => q.type === QuestionTypeHomework.ESSAY)
      if (!hasEssay) {
        // tất cả đều tự động chấm
        const sumQuestionPoints = hw.total_points ?? (hw.questions.reduce((s, q) => s + Number(q.points || 0), 0) || 1)
        const percent = (totalScore / sumQuestionPoints) * 100

        savedSub.score = Number(totalScore)
        savedSub.status = SubmissionStatus.AUTO_GRADED
        ;(savedSub as any).percent = percent // nếu có cột percent thì lưu vào đó, nếu không thì tính toán trên client
        await subRepo.save(savedSub)
      } else {
        // điểm từng câu cho MCQ answers; submission.status vẫn là PENDING
        savedSub.score = Number(totalScore)
        await subRepo.save(savedSub)
      }

      await queryRunner.commitTransaction()
      await queryRunner.release()

      // return submission with relations (use normal repo to fetch)
      // const result = await this.submissionRepo.findOne({
      //   where: { id: savedSub.id },
      //   relations: ['homework', 'answers', 'answers.question', 'answers.question.options', 'student'],
      // })
      const result = await this.submissionRepo
        .createQueryBuilder('submission')
        .select([
          'submission.id',
          'submission.score',
          'submission.status',
          'homework.id',
          'homework.title',
          'homework.description',
          'homework.total_points',
          'answers.id',
          'answers.score',
          'answers.answer_text',
          'answers.file',
          'answers.selected_option_ids',
          'question.id',
          'question.content',
          'question.type',
          'question.points',
          'options.id',
          'options.content',
          'options.is_correct',
          'student.id',
          'user.id',
          'user.full_name',
          'user.code',
          'user.email',
          'user.saint_name',
          'user.gender',
        ])
        .leftJoin('submission.homework', 'homework')
        .leftJoin('submission.answers', 'answers')
        .leftJoin('answers.question', 'question')
        .leftJoin('question.options', 'options')
        .leftJoin('submission.student', 'student')
        .leftJoin('student.user', 'user')
        .where('submission.id = :id', { id: savedSub.id })
        .getOne()

      const formattedResult = {
        id: result.id,
        score: result.score,
        status: result.status,
        homework: result.homework,
        answers: result.answers,
        student: {
          id: result.student.id,
          name: result.student.user.full_name,
          email: result.student.user.email,
          phone: result.student.user.phone_number,
          avatar: result.student.user.avatar,
        },
      }
      return formattedResult
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

  // grade one submission
  async teacherGradeSubmission(graderId: number, gradeDto: GradeSubmissionDto) {
    const { submission_id, answers: answersPayload } = gradeDto

    // start transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const subRepo = queryRunner.manager.getRepository(HomeworkSubmission)
      const ansRepo = queryRunner.manager.getRepository(HomeworkAnswer)
      const hwRepo = queryRunner.manager.getRepository(Homeworks)

      const submission = await subRepo.findOne({
        where: { id: submission_id },
        relations: ['homework', 'answers', 'answers.question', 'answers.question.options', 'student'],
      })
      if (!submission) throwAppException('SUBMISSION_NOT_FOUND', ErrorCode.SUBMISSION_NOT_FOUND, HttpStatus.NOT_FOUND)

      // optionally: check permission: graderId is teacher of this class/homework (not implemented here)
      // validate payload answers belong to submission
      const ansMap = new Map<number, HomeworkAnswer>()
      for (const a of submission.answers || []) ansMap.set(a.id, a)

      // apply grading per answer
      for (const aPayload of answersPayload) {
        const exist = ansMap.get(aPayload.answer_id)
        if (!exist) {
          throwAppException('ANSWER_NOT_BELONG_TO_SUBMISSION', ErrorCode.ANSWER_NOT_BELONG_TO_SUBMISSION, HttpStatus.BAD_REQUEST)
        }

        // load question points (already in relations)
        const q = exist.question as HomeworkQuestion
        if (!q) throwAppException('QUESTION_NOT_FOUND', ErrorCode.QUESTION_NOT_FOUND, HttpStatus.BAD_REQUEST)

        const maxPoint = Number(q.points || 0)
        const given = Number(aPayload.score)
        if (isNaN(given) || given < 0) {
          throwAppException('INVALID_SCORE', ErrorCode.INVALID_SCORE, HttpStatus.BAD_REQUEST)
        }
        if (given > maxPoint) {
          throwAppException('SCORE_EXCEEDS_MAX', ErrorCode.SCORE_EXCEEDS_MAX, HttpStatus.BAD_REQUEST)
        }

        // persist grading to answer
        exist.score = given
        exist.feedback = aPayload.feedback ?? exist.feedback
        await ansRepo.save(exist)
      }

      // recompute total score
      const reloadedAnswers = await ansRepo.find({ where: { submission: { id: submission.id } } as any, relations: ['question'] })
      const totalScore = reloadedAnswers.reduce((s, a) => s + Number(a.score || 0), 0)

      // compute percent: prefer homework.total_points if set
      const hw = await hwRepo.findOne({ where: { id: submission.homework.id }, relations: ['questions'] })
      const sumQuestionPoints = hw?.total_points ?? (hw?.questions?.reduce((s, q) => s + Number(q.points || 0), 0) || 1)
      const percent = (totalScore / sumQuestionPoints) * 100

      // update submission
      submission.score = Number(totalScore)
      ;(submission as any).percent = percent // nếu có cột percent, map tương ứng hoặc add column
      submission.status = SubmissionStatus.GRADED
      submission.graded_by = { id: graderId } as any
      submission.graded_at = new Date()
      await subRepo.save(submission)

      await queryRunner.commitTransaction()
      await queryRunner.release()

      // return full submission using main repo to avoid queryRunner release race
      return this.submissionRepo.findOne({
        where: { id: submission.id },
        relations: ['homework', 'answers', 'answers.question', 'answers.question.options', 'student', 'graded_by'],
      })
    } catch (err) {
      try {
        await queryRunner.rollbackTransaction()
      } catch (e) {
        /* ignore */
      }
      try {
        await queryRunner.release()
      } catch (e) {
        /* ignore */
      }
      throw err
    }
  }

  /* =====================================================
  ====================== Submission=======================
  ===================================================== */

  //Student xem bài mình đã nộp (answers + điểm)
  async getMySubmission(userId: number, homeworkId: number) {
    const student = await this.studentRepo.findOne({
      where: { user: { id: userId } },
    })
    if (!student) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const submission = await this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.homework', 'homework')
      .leftJoinAndSelect('submission.answers', 'answers')
      .leftJoinAndSelect('answers.question', 'question')
      .leftJoinAndSelect('question.options', 'options')
      .where('submission.student_id = :studentId', { studentId: student.id })
      .andWhere('homework.id = :homeworkId', { homeworkId })
      .getOne()

    if (!submission) {
      throwAppException('SUBMISSION_NOT_FOUND', ErrorCode.SUBMISSION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    return {
      id: submission.id,
      score: submission.score,
      status: submission.status,
      homework: {
        id: submission.homework.id,
        title: submission.homework.title,
        total_points: submission.homework.total_points,
      },
      answers: submission.answers.map(a => ({
        id: a.id,
        question: {
          id: a.question.id,
          content: a.question.content,
          type: a.question.type,
          points: a.question.points,
          options: a.question.options,
        },
        selected_option_ids: a.selected_option_ids,
        answer_text: a.answer_text,
        file: a.file,
        score: a.score,
        feedback: a.feedback,
      })),
    }
  }

  //Teacher/admin xem tất cả bài nộp của 1 homework
  async getSubmissionsByHomework(
    homeworkId: number,
    paginateSubmissionsDto: PaginateSubmissionsDto,
  ): Promise<{ data: IHomeworkSubmission[]; meta: PaginationMeta }> {
    const { homework_id, ...rest } = paginateSubmissionsDto
    const homework = await this.hwRepo.findOne({ where: { id: homework_id } })
    if (!homework) {
      throwAppException('HOMEWORK_NOT_FOUND', ErrorCode.HOMEWORK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const query = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('submission.answers', 'answers')
    if (homework_id) {
      query.andWhere('submission.homework_id = :homeworkId', { homeworkId: homework_id })
    }

    const { data, meta } = await paginate(query, rest)

    const formattedSubmissions = data.map(s => ({
      id: s.id,
      score: s.score,
      status: s.status,
      student: {
        id: s.student.id,
        name: s.student.user.full_name,
        email: s.student.user.email,
        code: s.student.user.code,
      },
      answer_count: s.answers.length,
      submitted_at: s.createdAt,
    }))

    return {
      data: formattedSubmissions,
      meta,
    }
  }

  //Teacher/admin xem chi tiết bài nộp của 1 student
  async getSubmissionDetail(submissionId: number) {
    const submission = await this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.homework', 'homework')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('submission.answers', 'answers')
      .leftJoinAndSelect('answers.question', 'question')
      .leftJoinAndSelect('question.options', 'options')
      .where('submission.id = :id', { id: submissionId })
      .getOne()

    if (!submission) {
      throwAppException('SUBMISSION_NOT_FOUND', ErrorCode.SUBMISSION_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    return {
      id: submission.id,
      score: submission.score,
      status: submission.status,
      homework: {
        id: submission.homework.id,
        title: submission.homework.title,
        total_points: submission.homework.total_points,
      },
      student: {
        id: submission.student.id,
        name: submission.student.user.full_name,
        email: submission.student.user.email,
      },
      answers: submission.answers.map(a => ({
        id: a.id,
        question: {
          id: a.question.id,
          content: a.question.content,
          type: a.question.type,
          points: a.question.points,
          options: a.question.options,
        },
        selected_option_ids: a.selected_option_ids,
        answer_text: a.answer_text,
        file: a.file,
        score: a.score,
        feedback: a.feedback,
      })),
    }
  }
}
