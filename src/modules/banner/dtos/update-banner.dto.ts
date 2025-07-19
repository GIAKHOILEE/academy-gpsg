import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateBannerDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'Ảnh banner' })
  image?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'https://example.com/url',
    description: 'Đường dẫn banner đến trang nào đó',
  })
  url?: string
}
