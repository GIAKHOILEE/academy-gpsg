import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateCalendarsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Title of the calendar' })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Content of the calendar' })
  content: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Image of the calendar' })
  image: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Day of the calendar', example: '2025-01-01' })
  day: string
}
