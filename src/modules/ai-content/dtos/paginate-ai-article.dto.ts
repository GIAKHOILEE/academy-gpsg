import { PaginationDto } from '@common/pagination'
import { AiImageSource, AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateAiArticleDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AiModuleType)
  @ApiPropertyOptional({ enum: AiModuleType, description: 'Lọc theo module (story, witness-faiths, post-catalog-top)' })
  module_type?: AiModuleType

  @IsOptional()
  @IsEnum(AiStatus)
  @ApiPropertyOptional({ enum: AiStatus, description: 'Lọc theo trạng thái AI (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)' })
  status?: AiStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Lọc theo ID đợt tạo (batch_id)' })
  batch_id?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Lọc theo ID danh mục (topic_id, witness_faith_menu_id, post_catalog_id)' })
  category_id?: number

  @IsOptional()
  @IsEnum(AiImageSource)
  @ApiPropertyOptional({ enum: AiImageSource, description: 'Lọc theo nguồn ảnh (AI_GENERATED, WEB_FALLBACK, MANUAL, NONE)' })
  image_source?: AiImageSource

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1'
  })
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, description: 'Lọc theo yêu cầu có ảnh hay không' })
  is_image?: boolean

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề hoặc nội dung prompt' })
  search?: string
}

