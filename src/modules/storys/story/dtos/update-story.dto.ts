import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Story Title' })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  image?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Story Content' })
  content?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1 })
  topic_id?: number
}
