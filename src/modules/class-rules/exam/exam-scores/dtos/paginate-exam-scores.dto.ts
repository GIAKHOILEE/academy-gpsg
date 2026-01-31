import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional } from 'class-validator'
import { PaginationDto } from '@common/pagination'

export class PaginateExamScoresDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của lớp',
  })
  @Type(() => Number)
  class_id?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của học sinh',
  })
  @Type(() => Number)
  student_id?: number
}
