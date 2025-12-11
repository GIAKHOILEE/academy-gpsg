import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateLessonDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của lớp',
    example: 1,
  })
  class_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tiêu đề của bài học',
    example: 'Bài học 1',
  })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Ngày bắt đầu học',
    example: '01/01/2025',
  })
  start_date: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Thời gian học',
    example: '10:00',
  })
  schedule: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Thời gian bắt đầu',
    example: '10:00',
  })
  start_time: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Thời gian kết thúc',
    example: '10:00',
  })
  end_time: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Mô tả của bài học',
    example: 'Mô tả bài học 1',
  })
  description: string

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của video',
    example: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  })
  video_url: string[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của slide',
    example: ['https://www.google.com', 'https://www.google.com'],
  })
  slide_url: string[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của tài liệu',
    example: ['https://www.google.com', 'https://www.google.com'],
  })
  document_url: string[]

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'URL của cuộc họp',
    example: 'https://www.google.com',
  })
  meeting_url: string
}
