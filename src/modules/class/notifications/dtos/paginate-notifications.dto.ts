import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateClassNotificationDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo class_id' })
  @Type(() => Number)
  class_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề' })
  title?: string
}
