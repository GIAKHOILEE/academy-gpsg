import { Injectable, NestMiddleware } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Request, Response, NextFunction } from 'express'
import { Visitor } from 'src/modules/visitor/visitor.entity'
import { MoreThan, Repository } from 'typeorm'
@Injectable()
export class VisitLoggerMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
    const userAgent = req.headers['user-agent'] || 'unknown'
    const realIp = Array.isArray(ip) ? ip[0] : ip

    // Lấy thời gian hiện tại và thời gian 10 phút trước
    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    // Kiểm tra xem đã có visitor với ip và user-agent trong 10 phút gần nhất chưa
    const existed = await this.visitorRepository.findOne({
      where: {
        ip: realIp,
        user_agent: userAgent,
        created_at: MoreThan(tenMinutesAgo),
      },
    })

    if (!existed) {
      await this.visitorRepository.save({
        ip: realIp,
        user_agent: userAgent,
        created_at: now,
      })
    }

    next()
  }
}
