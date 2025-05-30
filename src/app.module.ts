import { databaseConfig } from '@config/database.config'
import { AuthModule } from '@modules/auth/auth.module'
import { UsersModule } from '@modules/users/user.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppService } from './app.service'
import { LoggerMiddleware } from './middleware/logger.middleware'

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), AuthModule, UsersModule],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
