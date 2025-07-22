import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TeachersController } from './teachers.controller'
import { Teacher } from './teachers.entity'
import { TeachersService } from './teachers.service'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [TypeOrmModule.forFeature([Teacher]), HttpModule],
  controllers: [TeachersController],
  providers: [TeachersService, BrevoMailerService],
  exports: [TeachersService],
})
export class TeachersModule {}
