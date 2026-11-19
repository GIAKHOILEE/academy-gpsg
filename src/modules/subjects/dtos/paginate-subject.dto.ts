import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateSubjectDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã môn học' })
  code: string

  @Trim()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên môn học' })
  name: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'ID khoa' })
  department_id?: number
}
