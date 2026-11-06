import { PaginationDto } from '@common/pagination'
import { AiStatus } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
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

  @IsOptional()
  @IsEnum(AiStatus)
  @ApiPropertyOptional({ enum: AiStatus, description: 'Filter by AI generation status (PENDING, PROCESSING, COMPLETED, FAILED)' })
  ai_status?: AiStatus
}
