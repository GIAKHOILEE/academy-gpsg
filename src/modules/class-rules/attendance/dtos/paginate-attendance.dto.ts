import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateAttendanceDto {
  @ApiPropertyOptional({ description: 'ID user của học viên' })
  @IsNumber()
  @IsOptional()
  user_id?: number

  @ApiPropertyOptional({ description: 'Tên học viên' })
  @IsString()
  @IsOptional()
  full_name?: string
}
