import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID lớp', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID học viên', example: 1 })
  student_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Ngày điểm danh', example: '2025-01-01' })
  attendance_date: string
}
