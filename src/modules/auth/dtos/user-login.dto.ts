import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'superadmin', description: 'Username' })
  readonly username: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'superadmin123', description: 'Password' })
  readonly password: string
}

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1234567', description: 'Code' })
  readonly code: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'superadmin123', description: 'Password' })
  readonly password: string
}
