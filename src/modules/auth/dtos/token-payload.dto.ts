import { IsString } from 'class-validator'

export class TokenPayloadDto {
  @IsString()
  expiresIn: string

  @IsString()
  accessToken: string

  @IsString()
  refreshToken: string

  constructor(data: { expiresIn: string; accessToken: string; refreshToken: string }) {
    this.expiresIn = data.expiresIn
    this.accessToken = data.accessToken
    this.refreshToken = data.refreshToken
  }
}
