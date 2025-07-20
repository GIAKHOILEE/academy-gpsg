import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { FooterEnum } from '@enums/footer.enum'

export class CreateFooterDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Title of the footer', example: 'About Us' })
  title: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Content of the footer', example: 'This is the content of the footer' })
  content: string

  @IsEnum(FooterEnum)
  @IsNotEmpty()
  @ApiProperty({
    description: 'type: website_link, contact_us, terms_policy',
    example: FooterEnum.WEBSITE_LINK,
  })
  type: FooterEnum
}
