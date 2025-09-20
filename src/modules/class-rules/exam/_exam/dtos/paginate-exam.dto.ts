import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateExamDto extends PaginationDto {
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
}
