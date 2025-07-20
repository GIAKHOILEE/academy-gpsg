import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { PaginationDto } from 'src/common/pagination'

export class PaginateBannerDto extends PaginationDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'filter theo trạng thái' })
  isActive: boolean
}
