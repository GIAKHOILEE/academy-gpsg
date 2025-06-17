import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateStudyLinkDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tên', example: 'Tên' })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nội dung', example: 'Nội dung' })
  content: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Icon', example: 'https://example.com/icon.jpg' })
  icon: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh', example: 'https://example.com/image.jpg' })
  image: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Link', example: 'https://example.com' })
  url: string
}
