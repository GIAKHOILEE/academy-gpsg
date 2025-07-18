import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateCalendarsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Title of the calendar' })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Content of the calendar' })
  content: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Image of the calendar' })
  image: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Day of the calendar', example: '2025-01-01' })
  day: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Description of the calendar', example: 'Description of the calendar' })
  description: string
}
