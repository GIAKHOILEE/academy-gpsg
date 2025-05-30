import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Refresh token',
  })
  refreshToken: string
}
