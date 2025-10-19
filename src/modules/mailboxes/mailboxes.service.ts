import { HttpStatus, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { MailboxesEntity } from './mailboxes.entity'
import { CreateMailboxesDto } from './dtos/create-mailboxes.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { formatStringDate, throwAppException } from '@common/utils'
import { User } from '@modules/users/user.entity'
import { UpdateIsReadDto, UpdateMailboxesDto } from './dtos/update-mailboxes.dto'
import { IMailboxes } from './mailboxes.interface'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateMailboxesDto } from './dtos/paginate-mailboxes.dto'

@Injectable()
export class MailboxesService {
  constructor(
    @InjectRepository(MailboxesEntity)
    private readonly mailboxesRepository: Repository<MailboxesEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createMailboxes(createMailboxesDto: CreateMailboxesDto, userId: number): Promise<void> {
    console.log('userId', userId)
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const mailboxes = this.mailboxesRepository.create({
      ...createMailboxesDto,
      user_id: userId,
      user,
    })
    await this.mailboxesRepository.save(mailboxes)
  }

  async userUpdateMailboxes(id: number, updateMailboxesDto: UpdateMailboxesDto, userId: number): Promise<void> {
    const mailboxes = await this.mailboxesRepository.findOne({ where: { id } })
    if (!mailboxes) {
      throwAppException('MAILBOX_NOT_FOUND', ErrorCode.MAILBOX_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (mailboxes.user_id !== userId) {
      throwAppException('NOT_PERMISSION_UPDATE_MAILBOX', ErrorCode.NOT_PERMISSION_UPDATE_MAILBOX, HttpStatus.BAD_REQUEST)
    }
    await this.mailboxesRepository.update(id, updateMailboxesDto)
  }

  async adminUpdateIsReadMailboxes(id: number, updateIsReadDto: UpdateIsReadDto): Promise<void> {
    const mailboxes = await this.mailboxesRepository.exists({ where: { id } })
    if (!mailboxes) {
      throwAppException('MAILBOX_NOT_FOUND', ErrorCode.MAILBOX_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.mailboxesRepository.update(id, { is_read: updateIsReadDto.is_read })
  }

  async getMailboxes(paginateMailboxesDto: PaginateMailboxesDto, userId?: number): Promise<{ data: IMailboxes[]; meta: PaginationMeta }> {
    console.log('paginateMailboxesDto', paginateMailboxesDto)
    const query = this.mailboxesRepository
      .createQueryBuilder('mailboxes')
      .select([
        'mailboxes.id',
        'mailboxes.title',
        'mailboxes.is_read',
        'mailboxes.created_at',
        'user.id',
        'user.full_name',
        'user.saint_name',
        'user.email',
        'user.avatar',
      ])
      .leftJoin('mailboxes.user', 'user')
    if (userId) {
      query.where('mailboxes.user_id = :userId', { userId })
    }
    const { data, meta } = await paginate(query, paginateMailboxesDto)
    const formattedMailboxes: IMailboxes[] = data.map(mailboxes => ({
      id: mailboxes.id,
      title: mailboxes.title,
      // content: mailboxes.content,
      is_read: mailboxes.is_read,
      created_at: formatStringDate(mailboxes.created_at.toISOString()),
      user: {
        id: mailboxes.user.id,
        full_name: mailboxes.user.full_name,
        saint_name: mailboxes.user.saint_name,
        email: mailboxes.user.email,
        avatar: mailboxes.user.avatar,
      },
    }))

    return { data: formattedMailboxes, meta }
  }

  async getMailboxesById(id: number): Promise<IMailboxes> {
    const mailboxes = await this.mailboxesRepository
      .createQueryBuilder('mailboxes')
      .select([
        'mailboxes.id',
        'mailboxes.title',
        'mailboxes.content',
        'mailboxes.is_read',
        'mailboxes.created_at',
        'user.id',
        'user.full_name',
        'user.saint_name',
        'user.email',
        'user.avatar',
      ])
      .leftJoinAndSelect('mailboxes.user', 'user')
      .where('mailboxes.id = :id', { id })
      .getOne()
    if (!mailboxes) {
      throwAppException('MAILBOX_NOT_FOUND', ErrorCode.MAILBOX_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedMailboxes: IMailboxes = {
      id: mailboxes.id,
      title: mailboxes.title,
      content: mailboxes.content,
      is_read: mailboxes.is_read,
      created_at: formatStringDate(mailboxes.created_at.toISOString()),
      user: {
        id: mailboxes.user.id,
        full_name: mailboxes.user.full_name,
        saint_name: mailboxes.user.saint_name,
        email: mailboxes.user.email,
        avatar: mailboxes.user.avatar,
      },
    }
    return formattedMailboxes
  }
}
