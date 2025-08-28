import { PaginationDto } from '@common/pagination'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateNavigationAttendanceDto {
  index: number
  slug: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation content', example: 'navigation content' })
  content?: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'navigation title', example: 'navigation title' })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation link', example: 'navigation link' })
  link: string

  is_active: boolean
}

export class UpdateNavigationAttendanceDto {
  slug?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation content', example: 'navigation content' })
  content?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation title', example: 'navigation title' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation link', example: 'navigation link' })
  link?: string
}

export class FilterNavigationAttendanceDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo title' })
  title?: string
}
