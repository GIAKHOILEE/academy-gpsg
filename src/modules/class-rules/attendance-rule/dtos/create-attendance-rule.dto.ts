import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { AttendanceRuleType } from '@enums/class.enum'

export class CreateAttendanceRuleDto {
  // @IsNotEmpty()
  // @IsNumber()
  // @ApiProperty({ description: 'ID lớp', example: 1 })
  // class_id: number

  @IsNotEmpty()
  @IsEnum(AttendanceRuleType)
  @ApiProperty({ description: 'Loại quy tắc', example: AttendanceRuleType.REGULAR })
  type: AttendanceRuleType

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Ngày học', example: '2025-01-01' })
  lesson_date: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Thời gian bắt đầu nhận thẻ', example: '08:00' })
  card_start_time: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Thời gian kết thúc nhận thẻ', example: '17:00' })
  card_end_time: string

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Thời gian trễ', example: 10 })
  delay: number
}
