import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClassActivitiesEntity } from './class-activities.entity'
import { CreateClassActivitiesDto } from './dtos/create-class-activities.dto'
import { Classes } from '@modules/class/class.entity'
import { formatStringDate, throwAppException } from '@common/utils'
import { Teacher } from '@modules/teachers/teachers.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { IClassActivities } from './class-activities.interface'
import { UpdateClassActivitiesDto } from './dtos/update-class-activities.dto'
import { PaginateClassActivitiesDto } from './dtos/paginate-class-activities.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { CommentEntity } from '../comment/comment.entity'

@Injectable()
export class ClassActivitiesService {
  constructor(
    @InjectRepository(ClassActivitiesEntity)
    private readonly classActivitiesRepository: Repository<ClassActivitiesEntity>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  async createClassActivities(createClassActivitiesDto: CreateClassActivitiesDto): Promise<void> {
    const { class_id, teacher_id, ...rest } = createClassActivitiesDto

    const classExists = await this.classRepository
      .createQueryBuilder('class')
      .select(['class.id', 'class.teacher_id'])
      .where('class.id = :class_id', { class_id })
      .getOne()
    if (!classExists) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (classExists.teacher_id !== teacher_id) {
      throwAppException('TEACHER_NOT_IN_CLASS', ErrorCode.TEACHER_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }

    const teacherExists = await this.teacherRepository.findOne({ where: { id: teacher_id } })
    if (!teacherExists) {
      throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const classActivities = this.classActivitiesRepository.create({
      ...rest,
      teacher: teacherExists,
      class_id,
      teacher_id,
    })

    await this.classActivitiesRepository.save(classActivities)
  }

  async updateClassActivities(id: number, updateClassActivitiesDto: UpdateClassActivitiesDto): Promise<void> {
    const classActivities = await this.classActivitiesRepository.findOne({ where: { id } })
    if (!classActivities) {
      throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (updateClassActivitiesDto.teacher_id) {
      const teacherExists = await this.teacherRepository.findOne({ where: { id: updateClassActivitiesDto.teacher_id } })
      if (!teacherExists) {
        throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      classActivities.teacher = teacherExists
      classActivities.teacher_id = updateClassActivitiesDto.teacher_id

      const classExists = await this.classRepository
        .createQueryBuilder('class')
        .select(['class.id', 'class.teacher_id'])
        .where('class.id = :class_id', { class_id: updateClassActivitiesDto.class_id || classActivities.class_id })
        .getOne()
      if (classExists.teacher_id !== updateClassActivitiesDto.teacher_id) {
        throwAppException('TEACHER_NOT_IN_CLASS', ErrorCode.TEACHER_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    }

    if (updateClassActivitiesDto.class_id) {
      const classExists = await this.classRepository.exists({ where: { id: updateClassActivitiesDto.class_id } })
      if (!classExists) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
    }

    await this.classActivitiesRepository.update(id, {
      ...updateClassActivitiesDto,
      teacher: classActivities.teacher,
      teacher_id: classActivities.teacher_id,
    })
  }

  async deleteClassActivities(id: number): Promise<void> {
    const classActivities = await this.classActivitiesRepository.exists({ where: { id } })
    if (!classActivities) {
      throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.classActivitiesRepository.delete(id)
  }

  async getClassActivitiesById(id: number): Promise<IClassActivities> {
    const classActivities = await this.classActivitiesRepository
      .createQueryBuilder('class_activities')
      .select([
        'class_activities.id',
        'class_activities.title',
        'class_activities.file_url',
        'class_activities.description',
        'class_activities.content',
        'class_activities.class_id',
        'class_activities.teacher_id',
        'class_activities.created_at',
        'class_activities.updated_at',
        'teacher.id',
        'user.full_name',
        'user.saint_name',
        'user.avatar',
      ])
      .leftJoin('class_activities.teacher', 'teacher')
      .leftJoin('teacher.user', 'user')
      .where('class_activities.id = :id', { id })
      .getOne()
    if (!classActivities) {
      throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // lấy thôn tin comment
    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .select([
        'comment.id',
        'comment.content',
        'comment.created_at',
        'comment.updated_at',
        'user.id',
        'user.full_name',
        'user.saint_name',
        'user.avatar',
      ])
      .leftJoin('comment.user', 'user')
      .where('comment.class_activities_id = :id', { id })
      .getMany()
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      role: comment.role,
      user: {
        id: comment.user.id,
        full_name: comment.user.full_name,
        saint_name: comment.user.saint_name,
        avatar: comment.user.avatar,
      },
      created_at: formatStringDate(comment.created_at.toISOString()),
      updated_at: formatStringDate(comment.updated_at.toISOString()),
    }))

    const formattedClassActivities: IClassActivities = {
      ...classActivities,
      teacher: {
        id: classActivities.teacher_id,
        full_name: classActivities.teacher.user.full_name,
        saint_name: classActivities.teacher.user.saint_name,
        avatar: classActivities.teacher.user.avatar,
      },
      comments: formattedComments,
      created_at: formatStringDate(classActivities.created_at.toISOString()),
      updated_at: formatStringDate(classActivities.updated_at.toISOString()),
    }
    return formattedClassActivities
  }

  async getClassActivities(paginateClassActivitiesDto: PaginateClassActivitiesDto): Promise<{ data: IClassActivities[]; meta: PaginationMeta }> {
    const query = this.classActivitiesRepository
      .createQueryBuilder('class_activities')
      .select([
        'class_activities.id',
        'class_activities.title',
        'class_activities.file_url',
        'class_activities.description',
        'class_activities.class_id',
        'class_activities.content',
        'class_activities.created_at',
        'class_activities.updated_at',
        'teacher.id',
        'user.full_name',
        'user.saint_name',
        'user.avatar',
      ])
      .leftJoin('class_activities.teacher', 'teacher')
      .leftJoin('teacher.user', 'user')
      .groupBy('class_activities.id')

    const { data, meta } = await paginate(query, paginateClassActivitiesDto)

    const formattedData: IClassActivities[] = data.map((classActivities: ClassActivitiesEntity) => ({
      ...classActivities,
      teacher: {
        id: classActivities.teacher_id,
        full_name: classActivities.teacher.user.full_name,
        saint_name: classActivities.teacher.user.saint_name,
        avatar: classActivities.teacher.user.avatar,
      },
      comments: [],
      created_at: formatStringDate(classActivities.created_at.toISOString()),
      updated_at: formatStringDate(classActivities.updated_at.toISOString()),
    }))

    return { data: formattedData, meta }
  }
}
