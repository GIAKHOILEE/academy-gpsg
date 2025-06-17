import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateFooterDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Title of the footer', example: 'About Us' })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Content of the footer', example: 'This is the content of the footer' })
  content: string
}
