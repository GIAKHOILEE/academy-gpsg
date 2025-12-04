import { IsArray, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tiêu đề của bài học',
    example: 'Bài học 1',
  })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Mô tả của bài học',
    example: 'Mô tả bài học 1',
  })
  description?: string

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của video',
    example: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  })
  video_url?: string[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của slide',
    example: ['https://www.google.com', 'https://www.google.com'],
  })
  slide_url?: string[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của tài liệu',
    example: ['https://www.google.com', 'https://www.google.com'],
  })
  document_url?: string[]
}
