import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateSemesterDto extends PaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên học kỳ',
  })
  name: string
}
