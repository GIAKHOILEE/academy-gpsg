import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateMailboxesDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
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

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Full name of the mailbox',
    example: 'Full Name',
  })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Email of the mailbox',
    example: 'Email',
  })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Phone number of the mailbox',
    example: 'Phone Number',
  })
  phone_number?: string
}
