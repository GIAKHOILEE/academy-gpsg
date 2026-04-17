import { PaginationDto } from '@common/pagination'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PaginateQuestionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Question of the question' })
  question?: string
}

export class PaginateQuestionsStatisticsDto extends PaginationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Class id of the question', example: '1' })
  class_id: string
}
