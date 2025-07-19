import { databaseConfig } from '@config/database.config'
import { LanguageMiddleware } from '@middleware/language.middleware'
import { VisitLoggerMiddleware } from '@middleware/visitor.middleware'
import { AuthModule } from '@modules/auth/auth.module'
import { CalendarsModule } from '@modules/calendars/calendars.module'
import { ScholasticModule } from '@modules/class/_scholastic/scholastic.module'
import { SemesterModule } from '@modules/class/_semester/semester.module'
import { ClassModule } from '@modules/class/class.module'
import { ContactModule } from '@modules/contact/contact.module'
import { DashboardModule } from '@modules/dashboard/dashboard.module'
import { DepartmentModule } from '@modules/departments/department.module'
import { EventsModule } from '@modules/events/events.module'
import { FooterModule } from '@modules/footer/footer.module'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { StoryModule } from '@modules/storys/story.module'
import { StudentsModule } from '@modules/students/students.module'
import { StudyLinkModule } from '@modules/study-link/study-link.module'
import { SubjectsModule } from '@modules/subjects/subjects.module'
import { TeachersModule } from '@modules/teachers/teachers.module'
import { User } from '@modules/users/user.entity'
import { UsersModule } from '@modules/users/user.module'
import { Visitor } from '@modules/visitor/visitor.entity'
import { VisitorModule } from '@modules/visitor/visitor.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SuperAdminSeeder } from '@seeders/supperadmin.seeder'
import { CloudinaryModule } from '@services/cloudinary/cloudinary.module'
import { ClsModule } from 'nestjs-cls'
import { AppService } from './app.service'
import { LoggerMiddleware } from './middleware/logger.middleware'
import { EnrollmentsModule } from './modules/enrollments/enrollments.module'
import { WitnessFaithModule } from './modules/witness-faiths/witness-faith.module'
import { PostModule } from '@modules/post/post.module'
import { PostCatalogModule } from '@modules/post-catalog/post-catalog.module'

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User, Visitor]),
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    SubjectsModule,
    SemesterModule,
    ScholasticModule,
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
    EnrollmentsModule,
    WitnessFaithModule,
    // BannersModule,
    PostCatalogModule,
    PostModule,
  ],
  providers: [AppService, SuperAdminSeeder],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
    consumer.apply(VisitLoggerMiddleware).forRoutes('/dashboard/analytics')
    consumer.apply(LanguageMiddleware).forRoutes('*')
  }
}
