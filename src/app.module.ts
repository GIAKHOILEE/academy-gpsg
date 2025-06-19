import { databaseConfig } from '@config/database.config'
import { AuthModule } from '@modules/auth/auth.module'
import { UsersModule } from '@modules/users/user.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppService } from './app.service'
import { LoggerMiddleware } from './middleware/logger.middleware'
import { SuperAdminSeeder } from '@seeders/supperadmin.seeder'
import { User } from '@modules/users/user.entity'
import { SubjectsModule } from '@modules/subjects/subjects.module'
import { CloudinaryModule } from '@services/cloudinary/cloudinary.module'
import { StudentsModule } from '@modules/students/students.module'
import { DepartmentModule } from '@modules/departments/department.module'
import { StoryModule } from '@modules/storys/story.module'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { EventsModule } from '@modules/events/events.module'
import { StudyLinkModule } from '@modules/study-link/study-link.module'
import { CalendarsModule } from '@modules/calendars/calendars.module'
import { TeachersModule } from '@modules/teachers/teachers.module'
import { VisitLoggerMiddleware } from '@middleware/visitor.middleware'
import { DashboardModule } from '@modules/dashboard/dashboard.module'
import { VisitorModule } from '@modules/visitor/visitor.module'
import { Visitor } from '@modules/visitor/visitor.entity'
import { ContactModule } from '@modules/contact/contact.module'
import { FooterModule } from '@modules/footer/footer.module'
import { ClassModule } from '@modules/class/class.module'

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User, Visitor]),
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    SubjectsModule,
    DepartmentModule,
    ClassModule,
    CalendarsModule,
    NotificationsModule,
    EventsModule,
    StudyLinkModule,
    StoryModule,
    DashboardModule,
    VisitorModule,
    ContactModule,
    FooterModule,
    CloudinaryModule,
  ],
  providers: [AppService, SuperAdminSeeder],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
    consumer.apply(VisitLoggerMiddleware).forRoutes('/dashboard/analytics')
  }
}
