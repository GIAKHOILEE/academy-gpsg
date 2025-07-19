import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { RevenueStatisticsDto } from './dtos/dashboard.dto'
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly enrollmentsRepository: Repository<Enrollments>,
  ) {}

  async revenueStatistics(revenueStatisticsDto: RevenueStatisticsDto): Promise<{
    total_revenue: number
    total_prepaid: number
    total_debt: number
    total_fee: number
  }> {
    const { start_date, end_date } = revenueStatisticsDto
    // Tính tổng tiền đã trả & chưa trả
    const queryBuilder = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.prepaid)', 'total_prepaid')
      .addSelect('SUM(enrollment.debt)', 'total_debt')
      .addSelect('SUM(enrollment.total_fee)', 'total_fee')

    if (start_date) {
      queryBuilder.andWhere('enrollment.registration_date >= :start_date', { start_date })
    }

    if (end_date) {
      queryBuilder.andWhere('enrollment.registration_date <= :end_date', { end_date })
    }

    const totalResult = await queryBuilder.getRawOne()

    return {
      total_revenue: totalResult.total_prepaid + totalResult.total_debt + totalResult.total_fee,
      total_prepaid: totalResult.total_prepaid || 0,
      total_debt: totalResult.total_debt || 0,
      total_fee: totalResult.total_fee || 0,
    }
  }
}
