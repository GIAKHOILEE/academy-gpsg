import { PaginationDto } from '@common/pagination'
import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginateQuestionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Question of the question' })
  question?: string
}

export class PaginateQuestionsStatisticsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Class id of the question', example: '1' })
  class_id?: string
}
