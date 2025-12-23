import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateDocumentsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The batch code of the document',
    example: 'BC',
  })
  batch_code: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The name of the document',
    example: 'Document 1',
  })
  name: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'The quantity of the document',
    example: 1,
  })
  quantity: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'The price of the document',
    example: 1,
  })
  import_price: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'The price of the document',
    example: 1,
  })
  sell_price: number

  @IsString()
  @ApiProperty({
    description: 'The image of the document',
    example: 'https://example.com/image.jpg',
  })
  image: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The description of the document',
    example: 'Description of the document',
  })
  description: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The day import of the document',
    example: '2025-01-01',
  })
  day_import: string
}
