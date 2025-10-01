import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import 'winston-daily-rotate-file'

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // Console transport - luôn bật
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ms }) => {
              return `${timestamp} [${context}] ${level}: ${message} ${ms}`
            }),
          ),
        }),

        // File transport - chỉ khi có LOG_PATH
        ...(process.env.LOG_PATH
          ? [
              // Rotate daily file cho tất cả logs
              new winston.transports.DailyRotateFile({
                filename: `${process.env.LOG_PATH}/app-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '100m',
                maxFiles: '30d',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
              }),

              // File riêng cho errors
              new winston.transports.DailyRotateFile({
                filename: `${process.env.LOG_PATH}/error-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '50m',
                maxFiles: '30d',
                level: 'error',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
              }),
            ]
          : []),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
