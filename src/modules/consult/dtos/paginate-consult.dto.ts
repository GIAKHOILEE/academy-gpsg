import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBooleanString, IsOptional, IsString } from 'class-validator'

export class PaginateConsultDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Tên thánh' })
  @IsString()
  @IsOptional()
  full_name?: string

  @ApiPropertyOptional({ description: 'Email' })
  @IsString()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @IsString()
  @IsOptional()
  phone_number?: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo đã đọc', example: true, type: Boolean })
  @IsBooleanString()
  is_read?: string
}
