import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { DiscussType } from '@enums/discuss.enum'
import { Type } from 'class-transformer'

export class UpdateDiscussDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Discuss content', example: 'This is a discuss' })
  content?: string

  @IsOptional()
  @IsEnum(DiscussType)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Loại thảo luận (1: TEXT, 2: IMG, 3: FILE)',
    enum: DiscussType,
    example: DiscussType.TEXT,
  })
  type?: DiscussType
}
