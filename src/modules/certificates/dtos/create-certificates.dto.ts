import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateCertificatesDto {
  @ApiProperty({
    example: 1,
    description: 'Student ID',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  student_id: number

  @ApiPropertyOptional({
    example: 'CODE',
    description: 'Certificate code',
  })
  @IsString()
  @IsOptional()
  code: string

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


  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Certificate image URL',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  image_url: string
}
