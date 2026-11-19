import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateTopicDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'gioi tre', description: 'Tên chủ đề' })
  @Trim()
  @IsString()
  @IsOptional()
  name?: string
}
