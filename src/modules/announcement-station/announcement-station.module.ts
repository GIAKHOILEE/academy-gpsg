import { Module } from '@nestjs/common'
import { AnnouncementStationService } from './announcement-station.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { AdminAnnouncementStationController } from './announcement-station.controller'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [TypeOrmModule.forFeature([Student, Teacher]), HttpModule],
  providers: [AnnouncementStationService, BrevoMailerService],
  controllers: [AdminAnnouncementStationController],
})
export class AnnouncementStationModule {}
