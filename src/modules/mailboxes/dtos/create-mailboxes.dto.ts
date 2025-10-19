import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateMailboxesDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Title of the mailbox',
    example: 'Title',
  })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Content of the mailbox',
    example: 'Content',
  })
  content: string
}
