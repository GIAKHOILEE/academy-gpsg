import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'
import { PaginationDto } from '@common/pagination'

export class PaginateDepartmentDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Mã khoa',
    example: 'PH001',
  })
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({
    description: 'Tên khoa',
    example: 'Ngoại ngữ',
  })
  @IsString()
  @IsOptional()
  name?: string
}
