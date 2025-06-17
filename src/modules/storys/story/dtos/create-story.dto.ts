import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateStoryDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Story Title' })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  thumbnail: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Story Content' })
  content: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ example: 1 })
  topic_id: number
}
