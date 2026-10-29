import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { WsAdapter } from '@nestjs/platform-ws'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import * as dotenv from 'dotenv'
import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { WinstonModule } from 'nest-winston'
import * as express from 'express'
dotenv.config()

async function bootstrap() {
  const instance = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ms }) => {
            return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${ms || ''}`
          }),
        ),
      }),

      ...(process.env.LOG_PATH
        ? [
            new winston.transports.DailyRotateFile({
              filename: `${process.env.LOG_PATH}/app-%DATE%.log`,
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '100m',
              maxFiles: '180d',
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),

            new winston.transports.DailyRotateFile({
              filename: `${process.env.LOG_PATH}/error-%DATE%.log`,
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '50m',
              maxFiles: '180d',
              level: 'error',
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
          ]
        : []),
    ],
  })

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance,
    }),
  })
  // set body parser limits ở đây (trước app.listen)
  app.use(express.json({ limit: '100mb' }))
  app.use(express.urlencoded({ limit: '100mb', extended: true }))
  app.enableCors({
    origin: '*',
  })
  app.useWebSocketAdapter(new WsAdapter(app))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Quản lý học viện')
    .setDescription('API documentation for Academy Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document)

  const host = process.env.HOST || 'localhost'
  const port = process.env.PORT || 5000
  await app.listen(port)

  console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

  console.info(`🚀 Server running on: ${host}:${port}`)
  // Log startup
  // const logger = app.get(WINSTON_MODULE_PROVIDER);
  // logger.info(`🚀 Server running on: ${host}:${port}`, {
  //   context: 'Bootstrap',
  // });
}
bootstrap()
