import { Module } from '@nestjs/common'
import { StudentsController } from './students.controller'
import { StudentsService } from './students.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from './students.entity'
import { User } from '../users/user.entity'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { HttpModule } from '@nestjs/axios'
import { LibrarySyncService } from '@services/library-sync/library-sync.service'

@Module({
  imports: [TypeOrmModule.forFeature([Student, User]), HttpModule],
  controllers: [StudentsController],
  providers: [StudentsService, BrevoMailerService, LibrarySyncService],
  exports: [StudentsService],
})
export class StudentsModule {}
