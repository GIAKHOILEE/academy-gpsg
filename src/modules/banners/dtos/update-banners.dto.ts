import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Image of the banner', example: 'https://example.com/image.jpg' })
  image: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the banner', example: 'Banner 1' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Description of the banner', example: 'This is a banner' })
  description: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Content of the banner', example: 'This is a banner' })
  content: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Link of the banner', example: 'https://example.com/banner' })
  link: string
}
