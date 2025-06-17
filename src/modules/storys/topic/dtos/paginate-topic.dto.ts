import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateTopicDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'gioi tre', description: 'Tên chủ đề' })
  @IsString()
  @IsOptional()
  name?: string
}
