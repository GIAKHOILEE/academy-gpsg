import { AiStatus } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from 'src/common/pagination'

export class PaginatePostCatalogDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo id' })
  id: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo tên danh mục' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo slug' })
  slug: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'filter theo id parent' })
  parent_id: string

  @IsOptional()
  @IsEnum(AiStatus)
  @ApiPropertyOptional({ enum: AiStatus, description: 'filter theo trạng thái AI (PENDING, PROCESSING, COMPLETED, FAILED)' })
  ai_status?: AiStatus
}
