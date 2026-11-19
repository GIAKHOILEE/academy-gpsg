import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateTimekeepingDto extends PaginationDto {
  @IsOptional()
  @Trim()
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
