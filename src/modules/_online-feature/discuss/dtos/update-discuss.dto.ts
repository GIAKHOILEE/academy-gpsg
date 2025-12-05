import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDiscussDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Discuss content', example: 'This is a discuss' })
  content?: string
}
