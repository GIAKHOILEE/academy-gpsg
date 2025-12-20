import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateClassNotificationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This is a notification title' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This is a notification description' })
  description?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This is a notification content' })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  thumbnail?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ default: null, description: 'ID của bài học', example: null })
  lesson_id?: number

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false, description: 'Đánh dấu là thông báo khẩn cấp', example: false })
  urgent?: boolean
}
