import { IsNumber, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationDto } from '@common/pagination'

export class PaginateCommentDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID của hoạt động lớp học', example: 1 })
  class_activities_id: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID của học sinh', example: 1 })
  student_id: number
}
