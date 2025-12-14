import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateClassNotificationDto {
  index?: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'This is a notification title' })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'This is a notification description' })
  description: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'This is a notification content' })
  content: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  thumbnail: string
}
