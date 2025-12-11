import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateConsultDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên thánh',
    example: 'Thánh',
  })
  saint_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn A',
  })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Email',
    example: 'nguyenvana@gmail.com',
  })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Số điện thoại',
    example: '0909090909',
  })
  phone_number?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nội dung',
    example: 'Nội dung',
  })
  content?: string
}
