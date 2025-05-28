import { IsNumber, IsString } from 'class-validator'

export class TokenPayloadDto {
  @IsNumber()
  expiresIn: number

  @IsString()
  accessToken: string

  @IsString()
  refreshToken: string

  constructor(data: { expiresIn: number; accessToken: string; refreshToken: string }) {
    this.expiresIn = data.expiresIn
    this.accessToken = data.accessToken
    this.refreshToken = data.refreshToken
  }
}
