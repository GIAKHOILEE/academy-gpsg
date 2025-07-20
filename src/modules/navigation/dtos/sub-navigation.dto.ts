import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateSubNavigationDto {
  index: number

  slug: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'sub navigation title', example: 'sub navigation title' })
  title: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'sub navigation link', example: 'sub navigation link' })
  link: string

  is_active: boolean

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'navigation id', example: 1 })
  navigationId: number
}

export class UpdateSubNavigationDto {
  slug?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation title', example: 'sub navigation title' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation link', example: 'sub navigation link' })
  link?: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation id', example: 1 })
  navigationId?: number
}

export class FilterSubNavigationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo title' })
  title?: string
}
