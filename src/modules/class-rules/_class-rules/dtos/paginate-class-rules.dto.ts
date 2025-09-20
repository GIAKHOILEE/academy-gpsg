import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional } from 'class-validator'

export class PaginateClassRulesDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của lớp',
    example: 1,
  })
  @Type(() => Number)
  class_id: number
}
