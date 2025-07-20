import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Title of the event', example: 'Event Title' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Thumbnail of the event', example: 'https://example.com/thumbnail.jpg' })
  thumbnail?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Description of the event', example: 'Event Description' })
  description?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Content of the event', example: 'Event Content' })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Start date of the event', example: '2025-01-01' })
  start_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'End date of the event', example: '2025-01-01' })
  end_date?: string
}
