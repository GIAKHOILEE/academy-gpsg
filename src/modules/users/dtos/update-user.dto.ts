import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên tài khoản', example: 'John Doe' })
  username?: string

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Email', example: 'john.doe@example.com' })
  email?: string
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mật khẩu cũ', example: 'password123' })
  old_password: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mật khẩu mới', example: 'password123' })
  new_password: string
}
