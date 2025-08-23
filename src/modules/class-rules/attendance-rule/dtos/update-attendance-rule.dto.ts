import { AttendanceRuleType } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateAttendanceRuleDto {
  // @IsOptional()
  // @IsNumber()
  // @ApiPropertyOptional({ description: 'ID lớp', example: 1 })
  // class_id: number

  @IsOptional()
  @IsEnum(AttendanceRuleType)
  @ApiPropertyOptional({ description: 'Loại quy tắc', example: AttendanceRuleType.REGULAR })
  type: AttendanceRuleType

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Ngày học', example: '2025-01-01' })
  lesson_date: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Thời gian bắt đầu nhận thẻ', example: '08:00' })
  card_start_time: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Thời gian kết thúc nhận thẻ', example: '17:00' })
  card_end_time: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Thời gian trễ', example: 10 })
  delay: number
}
