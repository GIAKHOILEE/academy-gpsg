import { HttpStatus, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm/repository/Repository'
import { InjectRepository } from '@nestjs/typeorm'
import { FinancesEntity } from './finances.entity'
import { IFinances } from './finances.interface'
import { CreateFinancesDto } from './dtos/create-finances.dto'
import { UpdateFinancesDto } from './dtos/update-finances.dto'
import { PaginateFinancesDto } from './dtos/paginate-finances.dto'
import { formatStringDate, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { paginate, PaginationMeta } from '@common/pagination'

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(FinancesEntity)
    private readonly financesRepository: Repository<FinancesEntity>,
  ) {}

  async createFinances(finances: CreateFinancesDto): Promise<IFinances> {
    const { amount_received, amount_spent, ...rest } = finances
    const total_amount = amount_received ? amount_received : 0 - (amount_spent ? amount_spent : 0)
    const newFinances = this.financesRepository.create({ ...rest, amount_received, amount_spent, total_amount })
    const savedFinances = await this.financesRepository.save(newFinances)
    const formattedFinances: IFinances = {
      ...savedFinances,
      created_at: formatStringDate(savedFinances.created_at.toISOString()),
      updated_at: formatStringDate(savedFinances.updated_at.toISOString()),
    }
    return formattedFinances
  }

  async updateFinances(id: number, finances: UpdateFinancesDto): Promise<void> {
    const { amount_received, amount_spent, ...rest } = finances
    const financesToUpdate = await this.financesRepository.findOne({ where: { id } })
    if (!financesToUpdate) {
      throwAppException('FINANCES_NOT_FOUND', ErrorCode.FINANCES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const receive = amount_received ?? financesToUpdate.amount_received
    const spent = amount_spent ?? financesToUpdate.amount_spent
    const total_amount = receive - spent

    await this.financesRepository.update(id, { ...rest, amount_received: receive, amount_spent: spent, total_amount })
    // const formattedFinances: IFinances = {
    //   id: financesToUpdate.id,
    //   name: financesToUpdate.name,
    //   type: financesToUpdate.type,
    //   amount_received: financesToUpdate.amount_received,
    //   amount_spent: financesToUpdate.amount_spent,
    //   total_amount: financesToUpdate.total_amount,
    //   statement: financesToUpdate.statement,
    //   payment_method: financesToUpdate.payment_method,
    //   day: financesToUpdate.day,
    //   created_at: formatStringDate(financesToUpdate.created_at.toISOString()),
    //   updated_at: formatStringDate(financesToUpdate.updated_at.toISOString()),
    // }
  }

  async getFinances(paginateDto: PaginateFinancesDto): Promise<{ data: IFinances[]; meta: PaginationMeta }> {
    const query = this.financesRepository.createQueryBuilder('finances')

    const { data, meta } = await paginate(query, paginateDto)
    const formattedFinances: IFinances[] = data.map((finance: FinancesEntity) => ({
      ...finance,
      created_at: formatStringDate(finance.created_at.toISOString()),
      updated_at: formatStringDate(finance.updated_at.toISOString()),
    }))
    return {
      data: formattedFinances,
      meta,
    }
  }

  async getFinancesById(id: number): Promise<IFinances> {
    const finances = await this.financesRepository.findOne({ where: { id } })
    if (!finances) {
      throwAppException('FINANCES_NOT_FOUND', ErrorCode.FINANCES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedFinances: IFinances = {
      ...finances,
      created_at: formatStringDate(finances.created_at.toISOString()),
      updated_at: formatStringDate(finances.updated_at.toISOString()),
    }
    return formattedFinances
  }

  async deleteFinances(id: number): Promise<void> {
    const isExist = await this.financesRepository.exists({ where: { id } })
    if (!isExist) {
      throwAppException('FINANCES_NOT_FOUND', ErrorCode.FINANCES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.financesRepository.delete(id)
  }
}
