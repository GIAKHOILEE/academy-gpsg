import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateTopicDto {
  @ApiProperty({ example: 'Giới trẻ', description: 'Tên chủ đề' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional({ example: 'Description 1', description: 'Mô tả chủ đề' })
  @IsString()
  @IsOptional()
  description?: string
}
