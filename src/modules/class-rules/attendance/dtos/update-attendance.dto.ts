import { AttendanceStatus } from '@enums/class.enum'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Student ID', example: 1 })
  student_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Attendance Date', example: '2025-01-20' })
  attendance_date: string

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  @ApiProperty({ description: 'Attendance Status', enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  status: AttendanceStatus

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Ghi chú (lý do vắng,...)', example: 'Xin phép nghỉ ốm' })
  note?: string
}
