import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['lang'] = req.headers['accept-language']?.toString().split(',')[0] || 'vi'
    next()
  }
}
