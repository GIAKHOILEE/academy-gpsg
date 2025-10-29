import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateTimekeepingDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên nhân viên' })
  name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Năm' })
  year?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tháng' })
  month?: string
}
