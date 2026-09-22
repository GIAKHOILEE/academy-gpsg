import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DiscussType } from '@enums/discuss.enum'
import { Type } from 'class-transformer'

export class CreateDiscussDto {
  @IsOptional()
  @IsEnum(DiscussType)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Loại thảo luận (1: TEXT, 2: IMG, 3: FILE). Mặc định là 1 (TEXT)',
    enum: DiscussType,
    example: DiscussType.TEXT,
  })
  type?: DiscussType

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Parent comment id', example: 1 })
  parent_id?: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Discuss content', example: 'This is a discuss' })
  content: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Lesson id', example: 1 })
  lesson_id: number

  admin_responded?: boolean
  user_responded?: boolean
}
