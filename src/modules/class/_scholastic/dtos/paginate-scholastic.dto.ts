import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateScholasticDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên niên khóa',
  })
  name: string
}
