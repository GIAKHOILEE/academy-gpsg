import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsNotEmpty, IsUrl, IsOptional } from 'class-validator'

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

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Certificate image URL',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  image_url: string
}
