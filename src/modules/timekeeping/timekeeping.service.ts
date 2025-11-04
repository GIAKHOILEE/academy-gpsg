import { HttpStatus, Injectable } from '@nestjs/common'
import { Timekeeping } from './timekeeping.entity'
import { CreateTimekeepingDto } from './dtos/create-timekeeping.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ITimekeeping } from './timekeeping.interface'
import { UpdateTimekeepingDto } from './dtos/update-timekeeping.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { PaginateTimekeepingDto } from './dtos/paginate-timekeeping.dto'
import { PaginationMeta, paginate } from '@common/pagination'

@Injectable()
export class TimekeepingService {
  constructor(
    @InjectRepository(Timekeeping)
    private readonly timekeepingRepository: Repository<Timekeeping>,
  ) {}

  async createTimekeeping(createTimekeepingDto: CreateTimekeepingDto): Promise<ITimekeeping> {
    const timekeeping = this.timekeepingRepository.create(createTimekeepingDto)

    const savedTimekeeping = await this.timekeepingRepository.save(timekeeping)

    return {
      id: savedTimekeeping.id,
      ...savedTimekeeping,
    }
  }

  async updateTimekeeping(id: number, updateTimekeepingDto: UpdateTimekeepingDto): Promise<ITimekeeping> {
    const timekeeping = await this.timekeepingRepository.findOne({ where: { id } })
    if (!timekeeping) {
      throwAppException('TIMEKEEPING_NOT_FOUND', ErrorCode.TIMEKEEPING_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const updatedTimekeeping = this.timekeepingRepository.merge(timekeeping, updateTimekeepingDto)

    const savedTimekeeping = await this.timekeepingRepository.save(updatedTimekeeping)

    return {
      id: savedTimekeeping.id,
      ...savedTimekeeping,
    }
  }

  async getTimekeeping(paginateTimekeepingDto: PaginateTimekeepingDto): Promise<{ data: ITimekeeping[]; meta: PaginationMeta }> {
    const query = this.timekeepingRepository.createQueryBuilder('timekeeping')

    const { data, meta } = await paginate(query, paginateTimekeepingDto)

    const formattedData = data.map(timekeeping => {
      const total_hours = timekeeping.days.reduce((sum, v) => sum + (v ?? 0), 0)
      const total_salary = Number(total_hours) * Number(timekeeping.salary_per_hour) + Number(timekeeping.allowance)

      return {
        id: timekeeping.id,
        name: timekeeping.name,
        year: timekeeping.year,
        month: timekeeping.month,
        days: timekeeping.days,
        allowance: timekeeping.allowance,
        salary_per_hour: timekeeping.salary_per_hour,
        note: timekeeping.note,
        total_hours,
        total_salary: total_salary.toFixed(2),
      }
    })

    return {
      data: formattedData,
      meta,
    }
  }

  async getTimekeepingById(id: number): Promise<ITimekeeping> {
    const timekeeping = await this.timekeepingRepository.findOne({ where: { id } })
    if (!timekeeping) {
      throwAppException('TIMEKEEPING_NOT_FOUND', ErrorCode.TIMEKEEPING_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // tổng giờ
    const total_hours = timekeeping.days.reduce((sum, v) => sum + (v ?? 0), 0)
    // tổng lương
    const total_salary = Number(total_hours) * Number(timekeeping.salary_per_hour) + Number(timekeeping.allowance)

    const formattedTimekeeping = {
      id: timekeeping.id,
      name: timekeeping.name,
      year: timekeeping.year,
      month: timekeeping.month,
      days: timekeeping.days,
      allowance: timekeeping.allowance,
      salary_per_hour: timekeeping.salary_per_hour,
      note: timekeeping.note,
      total_hours,
      total_salary: total_salary.toFixed(2),
    }

    return formattedTimekeeping
  }

  async deleteTimekeeping(id: number): Promise<void> {
    const timekeeping = await this.timekeepingRepository.exists({ where: { id } })
    if (!timekeeping) {
      throwAppException('TIMEKEEPING_NOT_FOUND', ErrorCode.TIMEKEEPING_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.timekeepingRepository.delete(id)
  }
}
