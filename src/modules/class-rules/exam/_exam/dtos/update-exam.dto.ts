import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateExamDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của lớp',
    example: 1,
  })
  class_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên đề kiểm tra',
    example: 'Đề kiểm tra 15 phút',
  })
  name?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Tỷ lệ trọng số của đề kiểm tra',
    example: 0.3,
  })
  weight_percentage?: number
}
