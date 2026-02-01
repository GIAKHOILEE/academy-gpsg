import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateAttendanceDto {
  @ApiPropertyOptional({ description: 'ID user của học viên' })
  @IsString()
  @IsOptional()
  user_id?: string

  @ApiPropertyOptional({ description: 'Tên học viên' })
  @IsString()
  @IsOptional()
  full_name?: string
}
