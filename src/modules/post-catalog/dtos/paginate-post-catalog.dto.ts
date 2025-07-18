import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
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
}
