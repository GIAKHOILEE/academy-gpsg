import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'Mã khoa',
    example: 'PH001',
  })
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({
    description: 'Tên khoa',
    example: 'Ngoại ngữ',
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({
    description: 'Mô tả khoa',
    example: 'Khoa ngoại ngữ',
  })
  @IsString()
  @IsOptional()
  description?: string
}
