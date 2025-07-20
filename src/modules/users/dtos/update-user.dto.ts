import { Gender } from '@enums/role.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên đầy đủ', example: 'John Doe' })
  full_name?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên tài khoản', example: 'John Doe' })
  username?: string

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Email', example: 'john.doe@example.com' })
  email?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên thánh', example: 'John Doe' })
  saint_name?: string

  @IsEnum(Gender)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giới tính (1: MALE, 2: FEMALE)', example: '1' })
  gender?: Gender

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Số điện thoại', example: '081234567890' })
  phone_number?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Địa chỉ', example: 'Jl. Raya No. 123' })
  address?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://example.com/avatar.png' })
  avatar?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nơi sinh', example: 'Jl. Raya No. 123' })
  birth_place?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày sinh', example: '2000-01-01' })
  birth_date?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo xứ', example: 'Giáo xứ 1' })
  parish?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo hạt', example: 'Giáo hạt 1' })
  deanery?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo phận', example: 'Giáo phận 1' })
  diocese?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Dòng tu', example: 'Dòng tu 1' })
  congregation?: string
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

export class UpdateUserDtoV2 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên đầy đủ', example: 'John Doe' })
  full_name?: string

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Email', example: 'john.doe@example.com' })
  email?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên thánh', example: 'John Doe' })
  saint_name?: string

  @IsEnum(Gender)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giới tính (1: MALE, 2: FEMALE)', example: '1' })
  gender?: Gender

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Số điện thoại', example: '081234567890' })
  phone_number?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Địa chỉ', example: 'Jl. Raya No. 123' })
  address?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://example.com/avatar.png' })
  avatar?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nơi sinh', example: 'Jl. Raya No. 123' })
  birth_place?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày sinh', example: '2000-01-01' })
  birth_date?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo xứ', example: 'Giáo xứ 1' })
  parish?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo hạt', example: 'Giáo hạt 1' })
  deanery?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo phận', example: 'Giáo phận 1' })
  diocese?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Dòng tu', example: 'Dòng tu 1' })
  congregation?: string
}
