import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Lesson } from './lesson.entity'
import { CreateLessonDto } from './dtos/create-lesson.dto'
import { ILesson } from './lesson.interface'
import { Classes } from '@modules/class/class.entity'
import { arrayToObject, throwAppException } from '@common/utils'
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
import { IDiscuss } from '../discuss/discuss.interface'

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
    console.log(classExists)
    if (!classExists.is_online) {
      throwAppException('CLASS_IS_NOT_ONLINE', ErrorCode.CLASS_IS_NOT_ONLINE, HttpStatus.BAD_REQUEST)
    }

    const lesson = this.lessonRepository.create({
      ...createLessonDto,
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
    // nếu student không trong class thì không thể get
    if (user.role === Role.STUDENT) {
      const student = await this.studentRepository.findOne({ where: { user_id: userId } })
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
      ])
      .leftJoin('lesson.class', 'class')

    if (class_id) {
      const classExists = await this.classRepository.exists({ where: { id: class_id } })
      if (!classExists) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      queryBuilder.where('class.id = :class_id', { class_id })
    }

    const { data, meta } = await paginate(queryBuilder, paginateLessonDto)

    // lấy các discuss(admin_responded, user_responded) của lesson
    // nếu là admin thì lấy tất cả discuss(admin_responded, user_responded)
    // nếu là student thì lấy discuss của bản thân thôi (logic hiện tại học viên chỉ có 1 discuss mỗi lesson)
    const lessonIds = data.map(lesson => lesson.id)
    let discussMap: IDiscuss[] = []
    if (user.role === Role.STUDENT) {
      const discuss = await this.discussRepository.find({ where: { lesson: { id: In(lessonIds) }, user: { id: userId } } })
      discussMap = arrayToObject(discuss, 'lesson_id')
    } else {
      // admin/teacher lấy tất cả discuss(admin_responded, user_responded)
      const discuss = await this.discussRepository
        .createQueryBuilder('discuss')
        .select(['discuss.id', 'lesson.id', 'discuss.content', 'discuss.admin_responded', 'discuss.user_responded', 'discuss.parent_id'])
        .leftJoin('discuss.lesson', 'lesson')
        .where('lesson.id IN (:...lessonIds)', { lessonIds })
        .andWhere('discuss.parent_id IS NULL')
        .getRawMany()
      discussMap = arrayToObject(discuss, 'lesson_id')
    }
    // check list discussMap admin_responded, user_responded, ưu tiên lấy true

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
        discuss: {
          admin_responded: discussMap[lesson.id]?.admin_responded,
          user_responded: discussMap[lesson.id]?.user_responded,
        },
      }
    })

    return { data: formattedLessons, meta }
  }

  async getLessonById(id: number): Promise<ILesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id }, relations: ['class'] })
    if (!lesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
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
    }
  }
}
