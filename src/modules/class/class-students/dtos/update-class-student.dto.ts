import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional } from 'class-validator'

export class UpdateClassStudentDto {
  @ApiPropertyOptional({ description: 'Mã sinh viên', example: 1 })
  @IsNumber()
  @IsOptional()
  student_id: number

  @ApiPropertyOptional({ description: 'Mã lớp', example: 1 })
  @IsNumber()
  @IsOptional()
  class_id: number

  @ApiPropertyOptional({ description: 'Mã đăng ký', example: 1 })
  @IsNumber()
  @IsOptional()
  enrollment_id: number

  @ApiPropertyOptional({ description: 'Điểm số', example: 10 })
  @IsNumber()
  @IsOptional()
  score: number
}
