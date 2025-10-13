import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateStoryDto {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Index bài viết', example: 1 })
  index?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Story Title' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  thumbnail?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Story Content' })
  content?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1 })
  topic_id?: number
}
