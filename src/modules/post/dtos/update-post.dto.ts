import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên bài viết', example: 'Bài viết 1' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh bài viết', example: 'https://example.com/image.jpg' })
  image?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mô tả bài viết', example: 'Mô tả bài viết 1' })
  description?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nội dung bài viết', example: 'Nội dung bài viết 1' })
  content?: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'ID danh mục', example: 1 })
  post_catalog_id?: number
}
