import { Gender } from '@enums/role.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  full_name?: string

  @ApiProperty({
    description: 'Username of the user',
    minLength: 3,
    example: 'student1',
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  username: string

  @ApiProperty({
    description: 'Email of the user',
    example: 'student1@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    description: 'Password of the user',
    minLength: 6,
    example: '1234567',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional({
    description: 'Saint name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  saint_name?: string

  @ApiPropertyOptional({
    description: 'Gender of the user (1: MALE, 2: FEMALE)',
    enum: Gender,
    default: Gender.MALE,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender

  @ApiPropertyOptional({
    description: 'Phone number of the user',
    example: '081234567890',
  })
  @IsString()
  @IsOptional()
  phone_number?: string

  @ApiPropertyOptional({
    description: 'Address of the user',
    example: 'Jl. Raya No. 123',
  })
  @IsString()
  @IsOptional()
  address?: string

  @ApiPropertyOptional({
    description: 'Avatar of the user',
    example: 'https://example.com/avatar.png',
  })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional({
    description: 'Birth place of the user',
    example: 'Jl. Raya No. 123',
  })
  @IsString()
  @IsOptional()
  birth_place?: string

  @ApiPropertyOptional({
    description: 'Birth date of the user',
    example: '2000-01-01',
  })
  @IsString()
  @IsOptional()
  birth_date?: string

  @ApiPropertyOptional({
    description: 'Giáo xứ',
    example: 'Giáo xứ 1',
  })
  @IsString()
  @IsOptional()
  parish?: string

  @ApiPropertyOptional({
    description: 'Giáo hạt',
    example: 'Giáo hạt 1',
  })
  @IsString()
  @IsOptional()
  deanery?: string

  @ApiPropertyOptional({
    description: 'Giáo phận',
    example: 'Giáo phận 1',
  })
  @IsString()
  @IsOptional()
  diocese?: string

  @ApiPropertyOptional({
    description: 'Dòng tu',
    example: 'Dòng tu 1',
  })
  @IsString()
  @IsOptional()
  congregation?: string

  // @ApiPropertyOptional({
  //   description: 'Role of the user',
  //   enum: Role,
  //   default: Role.STUDENT,
  // })
  // @IsEnum(Role)
  // @IsOptional()
  // role?: Role

  // @ApiPropertyOptional({
  //   description: 'Status of the user',
  //   enum: UserStatus,
  //   default: UserStatus.ACTIVE,
  // })
  // @IsEnum(UserStatus)
  // @IsOptional()
  // status?: UserStatus
}

export class CreateUserDtoV2 {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  full_name?: string

  @ApiProperty({
    description: 'Email of the user',
    example: 'student1@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiPropertyOptional({
    description: 'if student: default is code, if teacher: default là giangvien',
    minLength: 6,
    example: '1234567',
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string

  @ApiPropertyOptional({
    description: 'Saint name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  saint_name?: string

  @ApiPropertyOptional({
    description: 'Gender of the user (1: MALE, 2: FEMALE)',
    enum: Gender,
    default: Gender.MALE,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender

  @ApiPropertyOptional({
    description: 'Phone number of the user',
    example: '081234567890',
  })
  @IsString()
  @IsOptional()
  phone_number?: string

  @ApiPropertyOptional({
    description: 'Address of the user',
    example: 'Jl. Raya No. 123',
  })
  @IsString()
  @IsOptional()
  address?: string

  @ApiPropertyOptional({
    description: 'Avatar of the user',
    example: 'https://example.com/avatar.png',
  })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional({
    description: 'Birth place of the user',
    example: 'Jl. Raya No. 123',
  })
  @IsString()
  @IsOptional()
  birth_place?: string

  @ApiPropertyOptional({
    description: 'Birth date of the user',
    example: '2000-01-01',
  })
  @IsString()
  @IsOptional()
  birth_date?: string

  @ApiPropertyOptional({
    description: 'Giáo xứ',
    example: 'Giáo xứ 1',
  })
  @IsString()
  @IsOptional()
  parish?: string

  @ApiPropertyOptional({
    description: 'Giáo hạt',
    example: 'Giáo hạt 1',
  })
  @IsString()
  @IsOptional()
  deanery?: string

  @ApiPropertyOptional({
    description: 'Giáo phận',
    example: 'Giáo phận 1',
  })
  @IsString()
  @IsOptional()
  diocese?: string

  @ApiPropertyOptional({
    description: 'Dòng tu',
    example: 'Dòng tu 1',
  })
  @IsString()
  @IsOptional()
  congregation?: string
}
