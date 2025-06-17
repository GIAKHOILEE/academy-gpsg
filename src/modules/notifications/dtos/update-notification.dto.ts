import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This is a notification title' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This is a notification content' })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  thumbnail?: string
}
