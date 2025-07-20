import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class CreateClassStudentDto {
  @ApiProperty({ description: 'Mã sinh viên', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  student_id: number

  @ApiProperty({ description: 'Mã lớp', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  class_id: number
}
