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
import { SelectQueryBuilder } from 'typeorm'

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(FinancesEntity)
    private readonly financesRepository: Repository<FinancesEntity>,
  ) {}

  async createFinances(finances: CreateFinancesDto): Promise<IFinances> {
    const { amount_received, amount_spent, ...rest } = finances
    const total_amount = amount_received ? amount_received : 0 - (amount_spent ? amount_spent : 0)
    const trading_day = this.buildTradingDay(rest.year, rest.month, rest.day)
    const newFinances = this.financesRepository.create({ ...rest, amount_received, amount_spent, total_amount, trading_day })
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
    const trading_day = this.buildTradingDay(
      rest.year ?? financesToUpdate.year,
      rest.month ?? financesToUpdate.month,
      rest.day ?? financesToUpdate.day,
    )

    await this.financesRepository.update(id, { ...rest, amount_received: receive, amount_spent: spent, total_amount, trading_day })
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

  async getFinances(paginateDto: PaginateFinancesDto): Promise<{
    data: IFinances[]
    meta: PaginationMeta
    total_amount_received: number
    total_amount_spent: number
    total_total_amount: number
  }> {
    const { start_day, end_day, ...rest } = paginateDto
    const query = this.financesRepository.createQueryBuilder('finances')

    rest.orderBy = rest.orderBy || 'trading_day'
    rest.orderDirection = rest.orderDirection || 'ASC'

    if (start_day) {
      query.andWhere('finances.trading_day >= :start_day', { start_day: this.transformDay(start_day) })
    }
    if (end_day) {
      query.andWhere('finances.trading_day <= :end_day', { end_day: this.transformDay(end_day) })
    }
    const { data, meta } = await paginate(query, rest)

    /** 1. Opening balance */
    // chỉ khi có start_day, end_day, semester_id, scholastic_id thì mới tính số dư đầu kỳ
    let openingBalance = 0
    const needOpeningBalance = !!start_day || !!end_day || !!rest.semester_id || !!rest.scholastic_id
    if (needOpeningBalance) {
      const openingQb = this.financesRepository
        .createQueryBuilder('finances')
        .select('COALESCE(SUM(finances.amount_received - finances.amount_spent), 0)', 'balance')

      this.buildBeforeFilterCondition(openingQb, paginateDto)
      const openingBalanceRaw = await openingQb.getRawOne()
      openingBalance = Number(openingBalanceRaw.balance)
    }

    let running_total_amount = openingBalance

    let total_amount_received = 0
    let total_amount_spent = 0

    /** 2. Running balance trong filter */
    const formattedFinances: IFinances[] = data.map((finance: FinancesEntity) => {
      const received = Number(finance.amount_received)
      const spent = Number(finance.amount_spent)

      total_amount_received += received
      total_amount_spent += spent

      running_total_amount += received - spent

      return {
        ...finance,
        total_amount: running_total_amount,
        created_at: formatStringDate(finance.created_at.toISOString()),
        updated_at: formatStringDate(finance.updated_at.toISOString()),
      }
    })

    return {
      data: formattedFinances,
      meta,
      total_amount_received,
      total_amount_spent,
      total_total_amount: running_total_amount,
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

  /* ===========================================================
  ==========================PRIVATE============================
  =========================================================== */
  private buildBeforeFilterCondition(qb: SelectQueryBuilder<FinancesEntity>, dto: PaginateFinancesDto) {
    if (dto.start_day) {
      qb.andWhere('finances.trading_day >= :start_day', {
        start_day: dto.start_day,
      })
    }

    if (dto.end_day) {
      qb.andWhere('finances.trading_day <= :end_day', {
        end_day: dto.end_day,
      })
    }

    if (dto.semester_id) {
      qb.andWhere('finances.semester_id < :semester_id', {
        semester_id: dto.semester_id,
      })
      return
    }

    if (dto.scholastic_id) {
      qb.andWhere('finances.scholastic_id < :scholastic_id', {
        scholastic_id: dto.scholastic_id,
      })
    }
  }

  private buildTradingDay(year?: number, month?: number, day?: number): number | null {
    // nếu 1 trong 3 cái không có thì cái đó lấy của hiện tại
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const currentDay = new Date().getDate()
    if (!year) year = currentYear
    if (!month) month = currentMonth
    if (!day) day = currentDay
    return year * 10000 + month * 100 + day
  }

  // từ YYYY-MM-DD thành YYYYMMDD
  private transformDay(stringDay?: string): number {
    if (!stringDay) return 0
    const [year, month, day] = stringDay.split('-')
    return Number(year) * 10000 + Number(month) * 100 + Number(day)
  }
}
