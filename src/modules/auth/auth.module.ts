import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { jwtConfig } from '@config/jwt.config'
import { UsersModule } from '@modules/users/user.module'

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtConfig.secret,
        signOptions: { algorithm: 'HS256', expiresIn: jwtConfig.expiresIn },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
