import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'

export class UpdateDocumentsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The batch code of the document',
    example: 'BC',
  })
  batch_code: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the document',
    example: 'Document 1',
  })
  name: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'The quantity of the document',
    example: 1,
  })
  quantity: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'The price of the document',
    example: 1,
  })
  import_price: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'The price of the document',
    example: 1,
  })
  sell_price: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
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

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The day import of the document',
    example: '2025-01-01',
  })
  day_import: string
}

export class BuyDocumentsDto {
  @IsNotEmpty()
  @IsNumber()
  id: number

  @IsNotEmpty()
  @IsNumber()
  quantity: number
}

export class UserBuyDocumentDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the document',
    example: 'Document 1',
  })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The email of the document',
    example: 'Document 1',
  })
  email: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The phone of the document',
    example: 'Document 1',
  })
  phone: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The address of the document',
    example: 'Document 1',
  })
  address: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The note of the document',
    example: 'Document 1',
  })
  note: string
}

export class CreateDocumentOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuyDocumentsDto)
  @ApiProperty({
    description: 'The documents to buy',
    type: [BuyDocumentsDto],
    example: [
      { id: 1, quantity: 1 },
      { id: 2, quantity: 2 },
    ],
  })
  buyDocuments: BuyDocumentsDto[]

  @ValidateNested()
  @Type(() => UserBuyDocumentDto)
  @ApiProperty({
    description: 'The user to buy the documents',
    type: UserBuyDocumentDto,
    example: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      address: '123 Main St, Anytown, USA',
      note: 'Note for the order',
    },
  })
  user: UserBuyDocumentDto
}
