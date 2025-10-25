import { PaginationDto } from '@common/pagination'
import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginateMailboxesDto extends PaginationDto {
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
