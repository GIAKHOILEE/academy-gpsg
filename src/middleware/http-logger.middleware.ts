import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    // Log khi response finish
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // Log TẤT CẢ requests
      const message = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`;
      
      // Log level tùy theo status code
      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }

      // Log đặc biệt cho DELETE requests
      if (method === 'DELETE') {
        this.logger.warn(`⚠️ DELETE operation: ${originalUrl} by IP: ${ip}`);
      }
    });

    next();
  }
}