import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private getVietnamTime(): string {
    const now = new Date()
    const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000) // UTC+7
    return vietnamTime.toISOString().replace('T', ' ').slice(0, 19)
  }

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    const { method, originalUrl } = req

    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      console.log(`[${this.getVietnamTime()}] ${method} ${originalUrl} - ${responseTime}ms`)
    })

    next()
  }
}
