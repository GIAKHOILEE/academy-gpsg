import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateTopicDto {
  @ApiPropertyOptional({ example: 'Giới trẻ', description: 'Tên chủ đề' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ example: 'Description 1', description: 'Mô tả chủ đề' })
  @IsString()
  @IsOptional()
  description?: string
}
