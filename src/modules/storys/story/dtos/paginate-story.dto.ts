import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class PaginateStoryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Story Title', description: 'Search by story title' })
  title?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Search by story topic id' })
  @Transform(({ value }) => Number(value))
  topic_id?: number
}
