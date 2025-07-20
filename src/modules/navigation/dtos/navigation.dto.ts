import { PaginationDto } from '@common/pagination'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateNavigationDto {
  index: number
  slug: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'navigation title', example: 'navigation title' })
  title: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'navigation link', example: 'navigation link' })
  link: string

  is_active: boolean
}

export class UpdateNavigationDto {
  slug?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation title', example: 'navigation title' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation link', example: 'navigation link' })
  link?: string
}

export class FilterNavigationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo title' })
  title?: string
}
