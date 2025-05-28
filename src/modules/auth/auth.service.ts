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
    return new TokenPayloadDto({
      expiresIn: jwtConfig.expiresIn,
      accessToken: await this.jwtService.signAsync({
        userId: data.userId,
        username: data.username,
        email: data.email,
        type: 'ACCESS_TOKEN',
        role: data.role,
      }),
      refreshToken: await this.jwtService.signAsync(
        {
          userId: data.userId,
          type: 'REFRESH_TOKEN',
          role: data.role,
        },
        {
          expiresIn: jwtConfig.expiresIn,
        },
      ),
    })
  }
}
