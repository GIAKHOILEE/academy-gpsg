import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Consult } from './consult.entity'
import { CreateConsultDto } from './dtos/create-consult.dto'
import { IConsult } from './consult.interface'
import { PaginateConsultDto } from './dtos/paginate-consult.dto'
import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { UpdateConsultDto } from './dtos/update-consult.dto'

@Injectable()
export class ConsultService {
  constructor(
    @InjectRepository(Consult)
    private consultRepository: Repository<Consult>,
  ) {}

  async create(createConsultDto: CreateConsultDto): Promise<IConsult> {
    const consult = this.consultRepository.create({
      ...createConsultDto,
      is_read: false,
    })
    return this.consultRepository.save(consult)
  }

  async getAll(pagination: PaginateConsultDto): Promise<{ data: IConsult[]; meta: PaginationMeta }> {
    const query = this.consultRepository.createQueryBuilder('consult')

    const { data, meta } = await paginate(query, pagination)

    const formattedData: IConsult[] = data.map((consult: Consult) => ({
      id: consult.id,
      saint_name: consult.saint_name,
      full_name: consult.full_name,
      email: consult.email,
      phone_number: consult.phone_number,
      content: consult.content,
      is_read: consult.is_read,
    }))

    return { data: formattedData, meta }
  }

  async getById(id: number): Promise<IConsult> {
    const consult = await this.consultRepository.findOne({ where: { id } })
    if (!consult) {
      throwAppException('CONSULT_NOT_FOUND', ErrorCode.CONSULT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return {
      id: consult.id,
      saint_name: consult.saint_name,
      full_name: consult.full_name,
      email: consult.email,
      phone_number: consult.phone_number,
      content: consult.content,
      is_read: consult.is_read,
    }
  }

  async update(id: number, updateConsultDto: UpdateConsultDto): Promise<void> {
    const consult = await this.consultRepository.exists({ where: { id } })
    if (!consult) {
      throwAppException('CONSULT_NOT_FOUND', ErrorCode.CONSULT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.consultRepository.update(id, updateConsultDto)
  }

  async updateIsRead(id: number): Promise<void> {
    const consult = await this.consultRepository.findOne({ where: { id }, select: ['id', 'is_read'] })
    if (!consult) {
      throwAppException('CONSULT_NOT_FOUND', ErrorCode.CONSULT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.consultRepository.update(id, { is_read: !consult.is_read })
  }

  async delete(id: number): Promise<void> {
    const consult = await this.consultRepository.exists({ where: { id } })
    if (!consult) {
      throwAppException('CONSULT_NOT_FOUND', ErrorCode.CONSULT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.consultRepository.delete(id)
  }
}
