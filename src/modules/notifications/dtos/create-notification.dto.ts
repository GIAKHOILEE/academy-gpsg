import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'This is a notification title' })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'This is a notification content' })
  content: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  thumbnail: string
}
