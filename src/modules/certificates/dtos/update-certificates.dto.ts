import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class UpdateCertificatesDto {
  @ApiPropertyOptional({
    example: '2022-01-01',
    description: 'Date of issue',
  })
  @IsString()
  @IsOptional()
  date_of_issue: string

  @ApiPropertyOptional({
    example: 'https://example.com/link',
    description: 'Certificate link URL',
  })
  @IsString()
  @IsOptional()
  link_url: string

  @ApiPropertyOptional({
    example: 'Content',
    description: 'Certificate content',
  })
  @IsString()
  @IsOptional()
  content: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image_url: string
}
