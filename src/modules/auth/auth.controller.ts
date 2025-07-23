import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { LoginPayloadDto } from './dtos/login-payload.dto'
import { RefreshTokenDto } from './dtos/refresh-token.dto'
import { AdminLoginDto, UserLoginDto } from './dtos/user-login.dto'
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin Đăng nhập hệ thống' })
  @Post('login')
  async adminLogin(@Body() userLoginDto: AdminLoginDto, @Res() res: Response) {
    const userAndRole = await this.authService.validate(userLoginDto)
    const token = await this.authService.createAccessToken({
      userId: userAndRole.id,
      username: userAndRole.username,
      role: userAndRole.role,
      email: userAndRole.email,
      code: userAndRole.code ?? '',
      saint_name: userAndRole?.saint_name ?? '',
    })
    /*==========================================
    =========login with Bearer token============
    ===========================================*/
    return res.status(HttpStatus.OK).json(new LoginPayloadDto(userAndRole, token))

    /*==========================================
    ===============login with cookie============
    ===========================================*/
    // res.cookie(Cookie.ACCESS_TOKEN, token.accessToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    //   maxAge: cookieConfig.maxAge,
    // })

    // res.cookie(Cookie.REFRESH_TOKEN, token.refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    //   maxAge: cookieConfig.maxAge,
    // })

    // const userAndRoleFormatted = {
    //   ...userAndRole,
    //   role: {
    //     ...userAndRole.role,
    //     permissions: userAndRole.role.permissions,
    //   },
    // }
    // res.status(HttpStatus.OK).json(new LoginPayloadDto(userAndRoleFormatted))
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User Đăng nhập hệ thống' })
  @Post('user/login')
  async userLogin(@Body() userLoginDto: UserLoginDto, @Res() res: Response) {
    const userAndRole = await this.authService.validateUser(userLoginDto)
    const token = await this.authService.createAccessToken({
      username: '',
      code: userAndRole.code,
      userId: userAndRole.id,
      role: userAndRole.role,
      email: userAndRole.email,
      saint_name: userAndRole.saint_name,
    })
    return res.status(HttpStatus.OK).json(new LoginPayloadDto(userAndRole, token))
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Res() res: Response) {
    return res.status(HttpStatus.OK).json(await this.authService.refreshToken(refreshTokenDto))
  }
}
