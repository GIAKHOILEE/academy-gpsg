import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateBookDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên sách / giáo trình' })
  name?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã sách / giáo trình' })
  code?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tác giả' })
  author?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo nhà xuất bản' })
  publisher?: string

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Lọc theo ID lớp học gắn với sách' })
  class_id?: number
}
