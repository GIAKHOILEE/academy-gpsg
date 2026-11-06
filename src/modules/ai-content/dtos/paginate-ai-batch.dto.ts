import { PaginationDto } from '@common/pagination'
import { AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateAiBatchDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AiModuleType)
  @ApiPropertyOptional({ enum: AiModuleType, description: 'Lọc theo loại module (story, witness-faiths, post-catalog-top)' })
  module_type?: AiModuleType

  @IsOptional()
  @IsEnum(AiStatus)
  @ApiPropertyOptional({ enum: AiStatus, description: 'Lọc theo trạng thái AI (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)' })
  status?: AiStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Lọc theo ID danh mục (topic_id, witness_faith_menu_id, post_catalog_id)' })
  category_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo nội dung prompt hoặc tên danh mục' })
  search?: string
}

