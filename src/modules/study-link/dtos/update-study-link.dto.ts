import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateStudyLinkDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên', example: 'Tên' })
  title?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nội dung', example: 'Nội dung' })
  content?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Icon', example: 'https://example.com/icon.jpg' })
  icon?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh', example: 'https://example.com/image.jpg' })
  image?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Link', example: 'https://example.com/link' })
  url?: string
}
