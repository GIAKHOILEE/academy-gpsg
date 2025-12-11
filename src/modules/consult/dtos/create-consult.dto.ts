import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateConsultDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên thánh',
    example: 'Thánh',
  })
  saint_name: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn A',
  })
  full_name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Email',
    example: 'nguyenvana@gmail.com',
  })
  email: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Số điện thoại',
    example: '0909090909',
  })
  phone_number: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nội dung',
    example: 'Nội dung',
  })
  content: string
}
