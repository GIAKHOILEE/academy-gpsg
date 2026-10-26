import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { Attendance } from '@modules/class-rules/attendance/attendance.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { StorageCryptoService } from '@modules/storage/services/storage-crypto.service'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { User } from '@modules/users/user.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HvmMeetSettingController } from './controllers/hvm-meet-setting.controller'
import { HvmMeetWebhookController } from './controllers/hvm-meet-webhook.controller'
import { LessonMeetingController } from './controllers/lesson-meeting.controller'
import { HvmMeetSettingEntity } from './entities/hvm-meet-setting.entity'
import { LessonMeetSession } from './entities/lesson-meet-session.entity'
import { HvmMeetClientService } from './services/hvm-meet-client.service'
import { HvmMeetSettingSeeder } from './services/hvm-meet-setting.seeder'
import { HvmMeetSettingService } from './services/hvm-meet-setting.service'
import { HvmMeetWebhookService } from './services/hvm-meet-webhook.service'
import { LessonMeetSessionService } from './services/lesson-meet-session.service'
import { LessonMeetingService } from './services/lesson-meeting.service'

/**
 * Tích hợp phòng học HVM Meet (thay link Google Meet cho buổi học online):
 * - cấu hình động, mã hoá trong DB (admin/hvm-meet/config)
 * - cấp vé vào phòng cho buổi học (POST lessons/:id/meeting/join)
 * - xem lại buổi học: danh sách session + vé trang replay (lessons/:id/meeting/sessions...)
 * - nhận webhook điểm danh / bản ghi hình (POST webhooks/hvm-meet)
 */
@Module({
  imports: [TypeOrmModule.forFeature([HvmMeetSettingEntity, LessonMeetSession, Lesson, User, Student, Teacher, ClassStudents, Attendance])],
  controllers: [HvmMeetSettingController, LessonMeetingController, HvmMeetWebhookController],
  providers: [
    // Dùng chung cách mã hoá (và khoá STORAGE_ENCRYPTION_KEY) với cấu hình dịch vụ lưu trữ
    StorageCryptoService,
    HvmMeetClientService,
    HvmMeetSettingService,
    HvmMeetSettingSeeder,
    LessonMeetSessionService,
    LessonMeetingService,
    HvmMeetWebhookService,
  ],
  exports: [HvmMeetSettingService, HvmMeetClientService, LessonMeetingService],
})
export class HvmMeetModule {}
