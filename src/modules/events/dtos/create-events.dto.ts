import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Title of the event', example: 'Event Title' })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Thumbnail of the event', example: 'https://example.com/thumbnail.jpg' })
  thumbnail: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Description of the event', example: 'Event Description' })
  description: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Content of the event', example: 'Event Content' })
  content: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Start date of the event', example: '2025-01-01' })
  start_date: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'End date of the event', example: '2025-01-01' })
  end_date: string
}
