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
import { Brackets, SelectQueryBuilder } from 'typeorm'

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
    rest.orderDirection = rest.orderDirection || 'DESC'

    if (start_day) {
      query.andWhere('finances.trading_day >= :start_day', { start_day: this.transformDay(start_day) })
    }
    if (end_day) {
      query.andWhere('finances.trading_day <= :end_day', { end_day: this.transformDay(end_day) })
    }
    const { data, meta } = await paginate(query, rest)

    if (data.length === 0) {
      return {
        data: [],
        meta,
        total_amount_received: 0,
        total_amount_spent: 0,
        total_total_amount: 0,
      }
    }

    /** 1. Calculate opening balance (all records historically BEFORE the oldest record on the current page) */
    const isDesc = rest.orderDirection === 'DESC'
    const oldestOnPage = isDesc ? data[data.length - 1] : data[0]

    // We calculate the absolute balance "từ xưa đến giờ" up to (but not including) the oldest transaction on this page.
    const openingQb = this.financesRepository
      .createQueryBuilder('finances')
      .select('COALESCE(SUM(finances.amount_received - finances.amount_spent), 0)', 'balance')

    // Apply the scope filters (semester/scholastic) if present in the main query
    if (rest.semester_id) openingQb.andWhere('finances.semester_id = :semester_id', { semester_id: rest.semester_id })
    if (rest.scholastic_id) openingQb.andWhere('finances.scholastic_id = :scholastic_id', { scholastic_id: rest.scholastic_id })

    // "Historically older" means strictly before this record's trading_day, or same day but smaller ID.
    openingQb.andWhere(
      new Brackets(qb => {
        qb.where('finances.trading_day < :tDay', { tDay: oldestOnPage.trading_day }).orWhere('finances.trading_day = :tDay AND finances.id < :tId', {
          tDay: oldestOnPage.trading_day,
          tId: oldestOnPage.id,
        })
      }),
    )

    const openingBalanceRaw = await openingQb.getRawOne()
    let running_total_amount = Number(openingBalanceRaw.balance)

    let total_amount_received = 0
    let total_amount_spent = 0

    /** 2. Calculate running balance for each row */
    let formattedFinances: IFinances[] = []

    if (isDesc) {
      // If DESC, we iterate the page data from end to start (chronological order)
      // to correctly calculate the running total for each row.
      const results: IFinances[] = new Array(data.length)
      for (let i = data.length - 1; i >= 0; i--) {
        const finance = data[i]
        const received = Number(finance.amount_received)
        const spent = Number(finance.amount_spent)

        total_amount_received += received
        total_amount_spent += spent

        running_total_amount += received - spent

        results[i] = {
          ...finance,
          total_amount: running_total_amount,
          created_at: formatStringDate(finance.created_at.toISOString()),
          updated_at: formatStringDate(finance.updated_at.toISOString()),
        }
      }
      formattedFinances = results
    } else {
      // If ASC, we iterate normally
      formattedFinances = data.map((finance: FinancesEntity) => {
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
    }

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
