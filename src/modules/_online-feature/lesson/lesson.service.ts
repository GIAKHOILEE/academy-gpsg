import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Lesson } from './lesson.entity'
import { CreateLessonDto } from './dtos/create-lesson.dto'
import { ILesson } from './lesson.interface'
import { Classes } from '@modules/class/class.entity'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { UpdateLessonDto } from './dtos/update-lesson.dto'
import { PaginateLessonDto } from './dtos/paginate-lesson.dto'
import { PaginationMeta } from '@common/pagination'
import { paginate } from '@common/pagination'
import { User } from '@modules/users/user.entity'
import { Role } from '@enums/role.enum'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Discuss } from '../discuss/discuss.entity'
import { LessonVideoProgress } from './lesson-video-progress.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { AttendanceRule } from '@modules/class-rules/attendance-rule/attendance-rule.entity'
import { AttendanceStatus, LearnType } from '@enums/class.enum'

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(Discuss)
    private discussRepository: Repository<Discuss>,
    @InjectRepository(LessonVideoProgress)
    private lessonVideoProgressRepository: Repository<LessonVideoProgress>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(AttendanceRule)
    private attendanceRuleRepository: Repository<AttendanceRule>,
  ) {}

  async createLesson(createLessonDto: CreateLessonDto): Promise<ILesson> {
    const lessonMaxIndex = await this.lessonRepository.createQueryBuilder('lesson').select('MAX(lesson.index) as maxIndex').getRawOne()

    let maxIndex = 1.0001
    if (lessonMaxIndex?.maxIndex) {
      maxIndex = lessonMaxIndex.maxIndex + 100
    }

    const classExists = await this.classRepository
      .createQueryBuilder('class')
      .select(['class.id', 'class.is_online'])
      .where('class.id = :id', { id: createLessonDto.class_id })
      .getOne()
    if (!classExists) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (!classExists.is_online) {
      throwAppException('CLASS_IS_NOT_ONLINE', ErrorCode.CLASS_IS_NOT_ONLINE, HttpStatus.BAD_REQUEST)
    }

    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      attendance_percent: createLessonDto.attendance_percent ?? 50,
      class: classExists,
      index: maxIndex,
    })

    const savedLesson = await this.lessonRepository.save(lesson)

    const formattedLesson: ILesson = {
      id: savedLesson.id,
      index: savedLesson.index,
      title: savedLesson.title,
      schedule: savedLesson.schedule,
      start_date: savedLesson.start_date,
      start_time: savedLesson.start_time,
      end_time: savedLesson.end_time,
      description: savedLesson.description,
      video_url: savedLesson.video_url,
      slide_url: savedLesson.slide_url,
      document_url: savedLesson.document_url,
      meeting_url: savedLesson.meeting_url,
      class_id: savedLesson.class.id,
      attendance_rule_id: savedLesson.attendance_rule_id,
      attendance_percent: savedLesson.attendance_percent,
    }
    return formattedLesson
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { id } })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.lessonRepository.createQueryBuilder('lesson').update(Lesson).set({ index }).where('id = :id', { id }).execute()
  }

  async updateLesson(id: number, updateLessonDto: UpdateLessonDto): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { id } })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.lessonRepository
      .createQueryBuilder('lesson')
      .update(Lesson)
      .set({ ...updateLessonDto })
      .where('id = :id', { id })
      .execute()
  }

  async deleteLesson(id: number): Promise<void> {
    const lessonExists = await this.lessonRepository.exists({ where: { id } })
    if (!lessonExists) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.lessonRepository.delete(id)
  }

  async getManyLesson(paginateLessonDto: PaginateLessonDto, userId: number): Promise<{ data: ILesson[]; meta: PaginationMeta }> {
    const class_id = paginateLessonDto.class_id

    // lấy user check role là student
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    let student: Student | null = null
    // nếu student không trong class thì không thể get
    if (user.role === Role.STUDENT) {
      student = await this.studentRepository.findOne({ where: { user_id: userId } })
      if (!student) {
        throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      const classStudent = await this.classStudentRepository.findOne({ where: { class_id: class_id, student_id: student.id } })
      if (!classStudent) {
        throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    }

    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .select([
        'lesson.id',
        'lesson.title',
        'lesson.schedule',
        'lesson.start_date',
        'lesson.start_time',
        'lesson.end_time',
        'lesson.description',
        'lesson.index',
        'lesson.video_url',
        'lesson.slide_url',
        'lesson.document_url',
        'lesson.meeting_url',
        'lesson.attendance_rule_id',
        'lesson.attendance_percent',
        'attendance_rule.id',
        'attendance_rule.lesson_date',
        'attendance_rule.type',
      ])
      .leftJoin('lesson.class', 'class')
      .leftJoin('lesson.attendance_rule', 'attendance_rule')

    if (class_id) {
      const classExists = await this.classRepository.exists({ where: { id: class_id } })
      if (!classExists) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      queryBuilder.where('class.id = :class_id', { class_id })
    }

    const { data, meta } = await paginate(queryBuilder, paginateLessonDto)

    const discussStatusMap: Record<number, { admin_responded: boolean; user_responded: boolean }> = {}
    const lessonIds = data.map(lesson => lesson.id)
    let discuss = []
    if (user.role === Role.STUDENT) {
      discuss = await this.discussRepository
        .createQueryBuilder('discuss')
        .select(['discuss.id', 'lesson.id', 'discuss.content', 'discuss.admin_responded', 'discuss.user_responded', 'discuss.parent_id'])
        .leftJoin('discuss.lesson', 'lesson')
        .where('lesson.id IN (:...lessonIds)', { lessonIds: lessonIds.length ? lessonIds : [0] })
        .andWhere('discuss.user_id = :userId', { userId })
        .andWhere('discuss.parent_id IS NULL')
        .getMany()
    } else {
      // admin/teacher lấy tất cả discuss(admin_responded, user_responded)
      const qb = this.discussRepository
        .createQueryBuilder('discuss')
        .select(['discuss.id', 'lesson.id', 'discuss.content', 'discuss.admin_responded', 'discuss.user_responded', 'discuss.parent_id'])
        .leftJoin('discuss.lesson', 'lesson')
        .andWhere('discuss.parent_id IS NULL')

      if (lessonIds.length) {
        qb.andWhere('lesson.id IN (:...lessonIds)', { lessonIds })
      } else {
        qb.andWhere('1 = 0') // đảm bảo không trả dữ liệu
      }

      discuss = await qb.getMany()
    }

    for (const d of discuss) {
      const lessonId = d.lesson_id ?? d.lesson?.id

      if (!discussStatusMap[lessonId]) {
        discussStatusMap[lessonId] = {
          admin_responded: false,
          user_responded: false,
        }
      }

      if (d.admin_responded) {
        discussStatusMap[lessonId].admin_responded = true
      }

      if (d.user_responded) {
        discussStatusMap[lessonId].user_responded = true
      }
    }

    // Nếu là student, lấy danh sách tiến trình xem video tương ứng
    const progressMap: Record<number, any> = {}
    if (user.role === Role.STUDENT && student && lessonIds.length) {
      const progresses = await this.lessonVideoProgressRepository.find({
        where: { student_id: student.id, lesson_id: In(lessonIds) },
      })
      // Mỗi video một dòng — tóm tắt theo video xem được nhiều nhất của buổi
      for (const p of progresses) {
        if (progressMap[p.lesson_id] && progressMap[p.lesson_id].watched_seconds >= p.watched_seconds) continue
        progressMap[p.lesson_id] = {
          last_position: p.last_position,
          watched_seconds: Number(p.watched_seconds.toFixed(1)),
          total_duration: p.total_duration,
          is_completed: p.is_completed,
          progress_percentage: Number(((p.watched_seconds / (p.total_duration || 1)) * 100).toFixed(1)),
        }
      }
    }

    const formattedLessons: ILesson[] = data.map(lesson => {
      return {
        id: lesson.id,
        index: lesson.index,
        title: lesson.title,
        schedule: lesson.schedule,
        start_date: lesson.start_date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        description: lesson.description,
        video_url: lesson.video_url,
        slide_url: lesson.slide_url,
        document_url: lesson.document_url,
        meeting_url: lesson.meeting_url,
        attendance_rule_id: lesson.attendance_rule_id,
        attendance_percent: lesson.attendance_percent ?? 50,
        attendance_rule: lesson.attendance_rule
          ? {
              id: lesson.attendance_rule.id,
              lesson_date: lesson.attendance_rule.lesson_date,
              type: lesson.attendance_rule.type,
            }
          : null,
        video_progress: progressMap[lesson.id]
          ? {
              ...progressMap[lesson.id],
              attendance_percent: lesson.attendance_percent ?? 50,
            }
          : null,
        discuss: {
          admin_responded: discussStatusMap[lesson.id]?.admin_responded,
          user_responded: discussStatusMap[lesson.id]?.user_responded,
        },
      }
    })

    return { data: formattedLessons, meta }
  }

  async getLessonById(id: number, userId?: number): Promise<ILesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['class', 'attendance_rule'],
    })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    let videoProgress = null
    if (userId) {
      const student = await this.studentRepository.findOne({ where: { user_id: userId } })
      if (student) {
        const progress = await this.lessonVideoProgressRepository.findOne({
          where: { lesson_id: id, student_id: student.id },
          order: { watched_seconds: 'DESC' },
        })
        if (progress) {
          videoProgress = {
            last_position: progress.last_position,
            watched_seconds: Number(progress.watched_seconds.toFixed(1)),
            total_duration: progress.total_duration,
            is_completed: progress.is_completed,
            progress_percentage: Number(((progress.watched_seconds / (progress.total_duration || 1)) * 100).toFixed(1)),
            attendance_percent: lesson.attendance_percent ?? 50,
          }
        }
      }
    }

    return {
      id: lesson.id,
      title: lesson.title,
      schedule: lesson.schedule,
      start_date: lesson.start_date,
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      description: lesson.description,
      index: lesson.index,
      class_id: lesson.class.id,
      video_url: lesson.video_url,
      slide_url: lesson.slide_url,
      document_url: lesson.document_url,
      meeting_url: lesson.meeting_url,
      attendance_rule_id: lesson.attendance_rule_id,
      attendance_percent: lesson.attendance_percent ?? 50,
      attendance_rule: lesson.attendance_rule
        ? {
            id: lesson.attendance_rule.id,
            lesson_date: lesson.attendance_rule.lesson_date,
            type: lesson.attendance_rule.type,
            card_start_time: lesson.attendance_rule.card_start_time,
            card_end_time: lesson.attendance_rule.card_end_time,
          }
        : null,
      video_progress: videoProgress,
    }
  }
}
