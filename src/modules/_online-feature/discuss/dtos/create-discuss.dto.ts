import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDiscussDto {
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
}
