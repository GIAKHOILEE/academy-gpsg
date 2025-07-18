import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tên bài viết', example: 'Bài viết 1' })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mô tả bài viết', example: 'Mô tả bài viết 1' })
  description: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nội dung bài viết', example: 'Nội dung bài viết 1' })
  content: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Ảnh bài viết', example: 'https://example.com/image.jpg' })
  image: string

  slug: string
  is_active?: boolean
  is_banner?: boolean | true

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'ID danh mục', example: 1 })
  post_catalog_id?: number
}
