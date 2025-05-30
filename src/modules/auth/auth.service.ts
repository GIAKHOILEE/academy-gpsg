import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { IUser } from '@modules/users/user.interface'
import { validateHash } from '@common/utils'
import { UserLoginDto } from './dtos/user-login.dto'
import { User } from '@modules/users/user.entity'
import { jwtConfig } from '@config/jwt.config'
import { TokenPayloadDto } from './dtos/token-payload.dto'
import { Role } from '@enums/role.enum'
import { RefreshTokenDto } from './dtos/refresh-token.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validate(userLoginDto: UserLoginDto): Promise<IUser> {
    const user = await this.userRepository.findOne({
      where: {
        username: userLoginDto.username,
      },
    })
    if (!user) {
      throw new UnauthorizedException('Invalid username or password')
    }
    const isPasswordValid = await validateHash(userLoginDto.password, user?.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password')
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

  async createAccessToken(data: {
    role: Role
    userId: number
    username: string
    email: string
  }): Promise<TokenPayloadDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          userId: data.userId,
          username: data.username,
          email: data.email,
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
        throw new UnauthorizedException('Invalid refresh token')
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      })

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      return this.createAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      })
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
