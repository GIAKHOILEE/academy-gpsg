import { IsArray, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IFile } from '@common/file'

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
    description: 'Ngày bắt đầu học',
    example: '01/01/2025',
  })
  start_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian học',
    example: '10:00',
  })
  schedule?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian bắt đầu',
    example: '10:00',
  })
  start_time?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian kết thúc',
    example: '10:00',
  })
  end_time?: string

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
    example: [
      { id: 1, name: 'slide1.pdf', path: 'https://www.google.com' },
      { id: 2, name: 'slide2.pdf', path: 'https://www.google.com' },
    ],
  })
  slide_url?: IFile[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của tài liệu',
    example: [
      { id: 1, name: 'document1.pdf', path: 'https://www.google.com' },
      { id: 2, name: 'document2.pdf', path: 'https://www.google.com' },
    ],
  })
  document_url?: IFile[]

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'URL của cuộc họp',
    example: 'https://www.google.com',
  })
  meeting_url?: string
}
