import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBooleanString, IsOptional } from 'class-validator'
import { PaginationDto } from 'src/common/pagination'

export class PaginateBannerDto extends PaginationDto {
  @IsOptional()
  @IsBooleanString()
  @ApiPropertyOptional({ description: 'filter theo trạng thái', example: true, type: Boolean })
  isActive: string
}
