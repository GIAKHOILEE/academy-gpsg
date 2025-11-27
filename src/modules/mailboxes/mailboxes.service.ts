import { HttpStatus, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { MailboxesEntity } from './mailboxes.entity'
import { CreateMailboxesDto } from './dtos/create-mailboxes.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { formatStringDate, throwAppException } from '@common/utils'
import { UpdateIsReadDto, UpdateMailboxesDto } from './dtos/update-mailboxes.dto'
import { IMailboxes } from './mailboxes.interface'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateMailboxesDto } from './dtos/paginate-mailboxes.dto'

@Injectable()
export class MailboxesService {
  constructor(
    @InjectRepository(MailboxesEntity)
    private readonly mailboxesRepository: Repository<MailboxesEntity>,
  ) {}

  async createMailboxes(createMailboxesDto: CreateMailboxesDto): Promise<void> {
    const mailboxes = this.mailboxesRepository.create({
      ...createMailboxesDto,
    })
    await this.mailboxesRepository.save(mailboxes)
  }

  async userUpdateMailboxes(id: number, updateMailboxesDto: UpdateMailboxesDto): Promise<void> {
    const mailboxes = await this.mailboxesRepository.findOne({ where: { id } })
    if (!mailboxes) {
      throwAppException('MAILBOX_NOT_FOUND', ErrorCode.MAILBOX_NOT_FOUND, HttpStatus.NOT_FOUND)
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

  async getMailboxes(paginateMailboxesDto: PaginateMailboxesDto): Promise<{ data: IMailboxes[]; meta: PaginationMeta }> {
    const query = this.mailboxesRepository
      .createQueryBuilder('mailboxes')
      .select([
        'mailboxes.id',
        'mailboxes.title',
        'mailboxes.is_read',
        'mailboxes.created_at',
        'mailboxes.full_name',
        'mailboxes.email',
        'mailboxes.phone_number',
      ])
    const { data, meta } = await paginate(query, paginateMailboxesDto)
    const formattedMailboxes: IMailboxes[] = data.map(mailboxes => ({
      id: mailboxes.id,
      title: mailboxes.title,
      // content: mailboxes.content,
      is_read: mailboxes.is_read,
      created_at: formatStringDate(mailboxes.created_at.toISOString()),
      full_name: mailboxes?.full_name,
      email: mailboxes?.email,
      phone_number: mailboxes?.phone_number,
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
        'mailboxes.full_name',
        'mailboxes.email',
        'mailboxes.phone_number',
      ])
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
      full_name: mailboxes?.full_name,
      email: mailboxes?.email,
      phone_number: mailboxes?.phone_number,
    }
    return formattedMailboxes
  }

  async deleteMailboxes(id: number): Promise<void> {
    const mailboxes = await this.mailboxesRepository.exists({ where: { id } })
    if (!mailboxes) {
      throwAppException('MAILBOX_NOT_FOUND', ErrorCode.MAILBOX_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.mailboxesRepository.delete(id)
  }
}
