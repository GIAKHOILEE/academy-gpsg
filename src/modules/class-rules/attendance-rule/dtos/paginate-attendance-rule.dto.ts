import { PaginationDto } from '@common/pagination'
import { AttendanceRuleType } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateAttendanceRuleDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Ngày học' })
  lesson_date: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ID lớp' })
  class_id: string

  @IsOptional()
  @IsEnum(AttendanceRuleType)
  @ApiPropertyOptional({ description: 'Loại quy tắc', enum: AttendanceRuleType })
  @Type(() => Number)
  type: AttendanceRuleType
}
