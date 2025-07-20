import { jwtConfig } from '@config/jwt.config'
import { User } from '@modules/users/user.entity'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Algorithm } from 'jsonwebtoken'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from '@strategies/jwt.strategy'
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      global: true,
      signOptions: { algorithm: jwtConfig.jwtAlgorithm as Algorithm },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
