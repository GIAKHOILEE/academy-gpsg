import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateClassActivitiesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên hoạt động' })
  title?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID lớp' })
  @Type(() => Number)
  class_id?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID giáo viên' })
  @Type(() => Number)
  teacher_id?: number
}
