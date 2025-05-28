import { IsString, IsEnum, MinLength, IsOptional, IsEmail, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'

export class CreateUserDto {
  @ApiProperty({
    description: 'Username of the user',
    minLength: 3,
    example: 'johndoe',
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  username: string

  @ApiProperty({
    description: 'Email of the user',
    example: 'johndoe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    description: 'Password of the user',
    minLength: 6,
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional({
    description: 'Role of the user',
    enum: Role,
    default: Role.USER,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role

  @ApiPropertyOptional({
    description: 'Status of the user',
    enum: UserStatus,
    default: UserStatus.INACTIVE,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus
}
