import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateWitnessFaithDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'The witness faith menu id',
    example: 1,
  })
  witness_faith_menu_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The name of the witness faith',
    example: 'John Doe',
  })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The image of the witness faith',
    example: 'https://example.com/image.jpg',
  })
  image: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The description of the witness faith',
    example: 'John Doe is a witness of faith',
  })
  description: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The content of the witness faith',
    example: 'John Doe is a witness of faith',
  })
  content: string
}
