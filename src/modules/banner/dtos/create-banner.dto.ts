import { IsOptional, IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'Ảnh banner' })
  image?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'https://example.com/url',
    description: 'Đường dẫn banner đến trang nào đó',
  })
  url?: string

  index?: number

  isActive?: boolean
}
