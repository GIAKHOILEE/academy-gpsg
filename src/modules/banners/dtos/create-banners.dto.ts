import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateBannerDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Image of the banner', example: 'https://example.com/image.jpg' })
  image: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Name of the banner', example: 'Banner 1' })
  name: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Description of the banner', example: 'This is a banner' })
  description: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Content of the banner', example: 'This is a banner' })
  content: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Link of the banner', example: 'https://example.com/banner' })
  link: string
}
