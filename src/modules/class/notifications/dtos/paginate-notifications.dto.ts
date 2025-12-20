import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBooleanString, IsNumber, IsOptional, IsString } from 'class-validator'

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

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo lesson_id' })
  @Type(() => Number)
  lesson_id?: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo urgent', example: true, type: Boolean })
  @IsBooleanString()
  urgent: string
}
