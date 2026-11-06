import { AiStatus } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from 'src/common/pagination'

export class PaginatePostDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo tên bài viết' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo slug bài viết' })
  slug?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo trạng thái', type: Boolean })
  is_active: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo banner', type: Boolean })
  is_banner: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo danh mục' })
  post_catalog_id?: number

  @IsOptional()
  @IsEnum(AiStatus)
  @ApiPropertyOptional({ enum: AiStatus, description: 'filter theo trạng thái AI (PENDING, PROCESSING, COMPLETED, FAILED)' })
  ai_status?: AiStatus
}
