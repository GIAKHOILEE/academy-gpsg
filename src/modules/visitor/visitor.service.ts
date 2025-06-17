import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'
import { Visitor } from './visitor.entity'
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private visitorRepository: Repository<Visitor>,
  ) {}

  async countToday() {
    return this.visitorRepository.count({
      where: {
        created_at: Between(startOfToday(), endOfToday()),
      },
    })
  }

  async countThisWeek() {
    return this.visitorRepository.count({
      where: {
        created_at: Between(startOfWeek(new Date()), endOfWeek(new Date())),
      },
    })
  }

  async countThisMonth() {
    return this.visitorRepository.count({
      where: {
        created_at: Between(startOfMonth(new Date()), endOfMonth(new Date())),
      },
    })
  }

  async countTotal() {
    return this.visitorRepository.count()
  }

  async countCurrentlyOnline() {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000)
    const result = await this.visitorRepository
      .createQueryBuilder('visitor')
      .select('COUNT(DISTINCT visitor.ip)', 'count')
      .where('visitor.created_at > :time', { time: tenMinsAgo })
      .getRawOne()

    return Number(result.count)
  }
}
