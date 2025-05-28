import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import * as dotenv from 'dotenv'
dotenv.config()

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: '*',
  })

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
}
bootstrap()
