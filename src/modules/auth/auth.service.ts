import { hashPassword, throwAppException, validateHash } from '@common/utils'
import { jwtConfig } from '@config/jwt.config'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'
import { IUser } from '@modules/users/user.interface'
import { HttpStatus, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RefreshTokenDto } from './dtos/refresh-token.dto'
import { TokenPayloadDto } from './dtos/token-payload.dto'
import { AdminLoginDto, UserLoginDto } from './dtos/user-login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validate(userLoginDto: AdminLoginDto): Promise<IUser> {
    const user = await this.userRepository.findOne({
      where: {
        username: userLoginDto.username,
      },
    })
    if (!user) {
      throwAppException('INVALID_USERNAME_OR_PASSWORD', ErrorCode.INVALID_USERNAME_OR_PASSWORD, HttpStatus.UNAUTHORIZED)
    }
    const isPasswordValid = await validateHash(userLoginDto.password, user?.password)
    if (!isPasswordValid) {
      throwAppException('INVALID_USERNAME_OR_PASSWORD', ErrorCode.INVALID_USERNAME_OR_PASSWORD, HttpStatus.BAD_REQUEST)
    }
    const formattedUser: IUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    }
    return formattedUser
  }

  async validateUser(userLoginDto: UserLoginDto): Promise<IUser> {
    const user = await this.userRepository.findOne({
      where: {
        code: userLoginDto.code,
      },
    })
    if (!user) {
      throwAppException('INVALID_CODE_OR_PASSWORD', ErrorCode.INVALID_CODE_OR_PASSWORD, HttpStatus.UNAUTHORIZED)
    }

    if (user?.password === userLoginDto.password) {
      const hashedPassword = await hashPassword(userLoginDto.password)
      await this.userRepository.update(user.id, { password: hashedPassword })
    } else {
      const isPasswordValid = await validateHash(userLoginDto.password, user?.password)
      if (!isPasswordValid) {
        throwAppException('INVALID_CODE_OR_PASSWORD', ErrorCode.INVALID_CODE_OR_PASSWORD, HttpStatus.UNAUTHORIZED)
      }
    }

    const formattedUser: IUser = {
      id: user.id,
      code: user.code,
      email: user.email,
      role: user.role,
      status: user.status,
      saint_name: user?.saint_name ?? '',
    }
    return formattedUser
  }

  async createAccessToken(data: {
    role: Role
    userId: number
    username: string
    email: string
    code: string
    saint_name: string
  }): Promise<TokenPayloadDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          userId: data.userId,
          username: data.username ?? '',
          email: data.email,
          saint_name: data.saint_name,
          code: data.code ?? '',
          type: 'ACCESS_TOKEN',
          role: data.role,
        },
        {
          secret: jwtConfig.accessToken.secret,
          expiresIn: jwtConfig.accessToken.expiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          userId: data.userId,
          type: 'REFRESH_TOKEN',
          role: data.role,
          code: data.code ?? '',
        },
        {
          secret: jwtConfig.refreshToken.secret,
          expiresIn: jwtConfig.refreshToken.expiresIn,
        },
      ),
    ])

    return new TokenPayloadDto({
      expiresIn: jwtConfig.accessToken.expiresIn,
      accessToken,
      refreshToken,
    })
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenPayloadDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: jwtConfig.refreshToken.secret,
      })

      if (payload.type !== 'REFRESH_TOKEN') {
        throwAppException('INVALID_REFRESH_TOKEN', ErrorCode.INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED)
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      })

      if (!user) {
        throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      return this.createAccessToken({
        userId: user.id,
        username: user.username,
        saint_name: user.saint_name,
        email: user.email,
        role: user.role,
        code: user.code,
      })
    } catch (error) {
      throwAppException('INVALID_REFRESH_TOKEN', ErrorCode.INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED)
    }
  }
}
