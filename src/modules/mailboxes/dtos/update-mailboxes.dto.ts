import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateMailboxesDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Title of the mailbox',
    example: 'Title',
  })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Content of the mailbox',
    example: 'Content',
  })
  content: string
}

export class UpdateIsReadDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Is read of the mailbox',
    example: false,
  })
  is_read: boolean
}
