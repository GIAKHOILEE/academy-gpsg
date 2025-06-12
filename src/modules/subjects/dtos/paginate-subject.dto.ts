import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateSubjectDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã môn học' })
  code: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên môn học' })
  name: string
}
