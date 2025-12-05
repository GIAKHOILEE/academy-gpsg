import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { In, Repository } from 'typeorm'
import { Discuss } from './discuss.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { CreateDiscussDto } from './dtos/create-discuss.dto'
import { arrayToObject, formatStringDate, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Lesson } from '../lesson/lesson.entity'
import { User } from '@modules/users/user.entity'
import { IDiscuss } from './discuss.interface'
import { UpdateDiscussDto } from './dtos/update-discuss.dto'
import { PaginateChildDiscussDto, PaginateDiscussDto } from './dtos/paginate-discuss.dto'
import { paginate, PaginationMeta } from '@common/pagination'

@Injectable()
export class DiscussService {
  constructor(
    @InjectRepository(Discuss)
    private readonly discussRepository: Repository<Discuss>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDiscuss(createDiscussDto: CreateDiscussDto, userId: number): Promise<IDiscuss> {
    const { parent_id, content, lesson_id } = createDiscussDto

    const existLesson = await this.lessonRepository.findOne({ where: { id: lesson_id } })
    if (!existLesson) {
      throwAppException('LESSON_NOT_FOUND', ErrorCode.LESSON_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (parent_id) {
      const existDiscuss = await this.discussRepository.findOne({ where: { id: parent_id } })
      if (!existDiscuss) {
        throwAppException('DISCUSS_NOT_FOUND', ErrorCode.DISCUSS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      // nếu parent mà còn có parent thì gắn luôn parent_id
      if (existDiscuss.parent_id) {
        createDiscussDto.parent_id = existDiscuss.parent_id
      }
    }

    const existUser = await this.userRepository.findOne({ where: { id: userId } })
    if (!existUser) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const discuss = this.discussRepository.create({
      ...createDiscussDto,
      user: existUser,
      lesson: existLesson,
    })
    const savedDiscuss = await this.discussRepository.save(discuss)
    return {
      id: savedDiscuss.id,
      content: savedDiscuss.content,
      user: existUser,
    }
  }

  async updateDiscuss(id: number, updateDiscussDto: UpdateDiscussDto, userId: number): Promise<void> {
    const { content } = updateDiscussDto
    const existDiscuss = await this.discussRepository
      .createQueryBuilder('discuss')
      .select(['discuss.id', 'user.id'])
      .where('discuss.id = :id', { id })
      .leftJoin('discuss.user', 'user')
      .getOne()

    if (!existDiscuss) {
      throwAppException('DISCUSS_NOT_FOUND', ErrorCode.DISCUSS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (existDiscuss.user.id !== userId) {
      throwAppException('DISCUSS_NOT_ALLOW_UPDATE', ErrorCode.DISCUSS_NOT_ALLOW_UPDATE, HttpStatus.FORBIDDEN)
    }
    await this.discussRepository.update(id, { content })
  }

  async deleteDiscuss(id: number, userId: number): Promise<void> {
    const existDiscuss = await this.discussRepository
      .createQueryBuilder('discuss')
      .select(['discuss.id', 'user.id'])
      .where('discuss.id = :id', { id })
      .leftJoin('discuss.user', 'user')
      .getOne()
    if (!existDiscuss) {
      throwAppException('DISCUSS_NOT_FOUND', ErrorCode.DISCUSS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (existDiscuss.user.id !== userId) {
      throwAppException('DISCUSS_NOT_ALLOW_DELETE', ErrorCode.DISCUSS_NOT_ALLOW_DELETE, HttpStatus.FORBIDDEN)
    }
    await this.discussRepository.delete(id)
  }

  async getParentDiscuss(paginateDiscussDto: PaginateDiscussDto): Promise<{ data: IDiscuss[]; meta: PaginationMeta }> {
    const queryBuilder = this.discussRepository
      .createQueryBuilder('discuss')
      .select([
        'discuss.id',
        'discuss.content',
        'discuss.createdAt',
        'discuss.parent_id',
        'user.id',
        'user.full_name',
        'user.saint_name',
        'user.avatar',
      ])
      .leftJoin('discuss.user', 'user')
      .leftJoin('discuss.lesson', 'lesson')
      .where('discuss.parent_id IS NULL')

    if (paginateDiscussDto.lesson_id) {
      queryBuilder.andWhere('lesson.id = :lesson_id', { lesson_id: paginateDiscussDto.lesson_id })
    }

    const { data, meta } = await paginate(queryBuilder, paginateDiscussDto)

    // nếu không có bài thảo luận trả về ngay
    if (!data || data.length === 0) {
      return { data: [], meta }
    }

    // lấy danh sách id của các discuss parent
    const parentIds = data.map(d => d.id)

    // Query để đếm số comment nhóm theo parent_id
    // trả về mảng dạng [{ parent_id: 1, count: '3' }, ...] (count là string khi dùng getRawMany)
    const countsRaw: { parent_id: number; count: string }[] = await this.discussRepository
      .createQueryBuilder('d')
      .select('d.parent_id', 'parent_id')
      .addSelect('COUNT(*)', 'count')
      .where('d.parent_id IN (:...ids)', { ids: parentIds })
      .andWhere('d.parent_id IS NOT NULL')
      .groupBy('d.parent_id')
      .getRawMany()

    // chuyển thành map { [parent_id]: number }
    const numberCommentByDiscuss: Record<number, number> = countsRaw.reduce(
      (acc, item) => {
        // getRawMany trả về các trường là string trong một số driver -> convert về number
        const pid = Number((item as any).parent_id)
        const cnt = Number((item as any).count) || 0
        acc[pid] = cnt
        return acc
      },
      {} as Record<number, number>,
    )

    const formattedDiscusses: IDiscuss[] = data.map(discuss => {
      return {
        id: discuss.id,
        content: discuss.content,
        user: {
          id: discuss.user.id,
          full_name: discuss.user.full_name,
          saint_name: discuss.user.saint_name,
          avatar: discuss.user.avatar,
        },
        number_comment: numberCommentByDiscuss[discuss.id] || 0,
        // lesson: discuss.lesson,
        created_at: formatStringDate(discuss.createdAt.toISOString()),
      }
    })
    return { data: formattedDiscusses, meta }
  }

  async getListChildDiscuss(paginateDiscussDto: PaginateChildDiscussDto): Promise<{ data: IDiscuss[]; meta: PaginationMeta }> {
    const { discuss_id, ...rest } = paginateDiscussDto
    const queryBuilder = this.discussRepository
      .createQueryBuilder('discuss')
      .select([
        'discuss.id',
        'discuss.content',
        'discuss.createdAt',
        'discuss.parent_id',
        'user.id',
        'user.full_name',
        'user.saint_name',
        'user.avatar',
      ])
      .leftJoin('discuss.user', 'user')
      .leftJoin('discuss.lesson', 'lesson')
      .where('discuss.parent_id = :id', { id: discuss_id })

    if (discuss_id) {
      const existDiscuss = await this.discussRepository.findOne({ where: { id: discuss_id } })
      if (!existDiscuss) {
        throwAppException('DISCUSS_NOT_FOUND', ErrorCode.DISCUSS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      queryBuilder.andWhere('discuss.parent_id = :id', { id: discuss_id })
    }

    const { data, meta } = await paginate(queryBuilder, rest)

    const formattedDiscusses: IDiscuss[] = data.map(discuss => {
      return {
        id: discuss.id,
        content: discuss.content,
        user: {
          id: discuss.user.id,
          full_name: discuss.user.full_name,
          saint_name: discuss.user.saint_name,
          avatar: discuss.user.avatar,
        },
        created_at: formatStringDate(discuss.createdAt.toISOString()),
      }
    })
    return { data: formattedDiscusses, meta }
  }
}
