import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationDto } from 'src/common/pagination'

export class PaginateStudyLinkDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên', example: 'Tên' })
  title?: string
}
