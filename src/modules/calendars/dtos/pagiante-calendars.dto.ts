import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateCalendarsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Title of the calendar' })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Day of the calendar', example: '2025-01-01' })
  day: string
}
