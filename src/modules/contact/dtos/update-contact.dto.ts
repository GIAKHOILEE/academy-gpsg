import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Icon',
    example: 'https://example.com/icon.png',
  })
  icon: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Logo',
    example: 'https://example.com/logo.png',
  })
  logo: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Address',
    example: '123 Main St, Anytown, USA',
  })
  address: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Copyright',
    example: '© 2024 Example Company. All rights reserved.',
  })
  copyright: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Name',
    example: 'Thư viện Giáo Phận Sài Gòn',
  })
  name: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Email',
    example: 'info@example.com',
  })
  email: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Hotline',
    example: '1234567890',
  })
  hotline: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Phone',
    example: '1234567890',
  })
  phone: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Slogan',
    example: 'Hiểu biết để yêu thương và phục vụ',
  })
  slogan: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Time work',
    example: '8:30 - 11:30 & 14:30 - 20:30 | Thứ 2 - Thứ 7',
  })
  time_work: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Map',
    example: 'https://example.com/map.png',
  })
  map: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Facebook',
    example: 'https://www.facebook.com/example',
  })
  facebook: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Instagram',
    example: 'https://www.instagram.com/example',
  })
  instagram: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Twitter',
    example: 'https://www.twitter.com/example',
  })
  twitter: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Youtube',
    example: 'https://www.youtube.com/example',
  })
  youtube: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Zalo',
    example: 'https://www.zalo.com/example',
  })
  zalo: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Skype',
    example: 'https://www.skype.com/example',
  })
  skype: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Telegram',
    example: 'https://www.telegram.com/example',
  })
  telegram: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whatsapp',
    example: 'https://www.whatsapp.com/example',
  })
  whatsapp: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Linkedin',
    example: 'https://www.linkedin.com/example',
  })
  linkedin: string
}
