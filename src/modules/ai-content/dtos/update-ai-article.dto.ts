import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateAiArticleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Tiêu đề bài viết đã chỉnh sửa', description: 'Tiêu đề (title / name) của bài viết' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Mô tả ngắn của bài viết', description: 'Mô tả (description) của bài viết' })
  description?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '<p>Nội dung chi tiết bài viết...</p>', description: 'Nội dung chi tiết (1000-3000 từ)' })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'URL hình ảnh (thumbnail / image)' })
  image_url?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Đổi danh mục đích (topic_id / witness_faith_menu_id / post_catalog_id)' })
  category_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Prompt riêng cho bài viết này khi gen lại', description: 'Prompt của bài viết' })
  prompt?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Có sử dụng ảnh hay không' })
  is_image?: boolean
}

