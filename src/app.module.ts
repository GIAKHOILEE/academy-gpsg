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

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UsersModule,
    StudentsModule,
    SubjectsModule,
    DepartmentModule,
    NotificationsModule,
    EventsModule,
    StudyLinkModule,
    StoryModule,
    CloudinaryModule,
  ],
  providers: [AppService, SuperAdminSeeder],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
