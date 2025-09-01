import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateSubNavigationAttendanceDto {
  index: number

  slug: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation content', example: 'sub navigation content' })
  content?: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'sub navigation title', example: 'sub navigation title' })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation link', example: 'sub navigation link' })
  link: string

  is_active: boolean

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'navigation id', example: 1 })
  navigationId: number
}

export class UpdateSubNavigationAttendanceDto {
  slug?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation title', example: 'sub navigation title' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation content', example: 'sub navigation content' })
  content?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'sub navigation link', example: 'sub navigation link' })
  link?: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'navigation id', example: 1 })
  navigationId?: number
}

export class FilterSubNavigationAttendanceDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo title' })
  title?: string
}
