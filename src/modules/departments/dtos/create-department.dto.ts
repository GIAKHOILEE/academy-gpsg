import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsNotEmpty } from 'class-validator'

export class CreateDepartmentDto {
  index?: number

  isActive?: boolean

  @ApiProperty({
    description: 'Mã khoa',
    example: 'PH001',
  })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    description: 'Tên khoa',
    example: 'Ngoại ngữ',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional({
    description: 'Mô tả khoa',
    example: 'Khoa ngoại ngữ',
  })
  @IsString()
  @IsOptional()
  description?: string
}
