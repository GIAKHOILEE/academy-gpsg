import { ApiProperty } from '@nestjs/swagger'
import { TeacherSpecial } from 'src/enums/user.enum'
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator'

export class UpdateTeacherSalaryDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của lớp',
    example: 1,
  })
  class_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của giáo viên',
    example: 1,
  })
  teacher_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Lương của giáo viên',
    example: 1000000,
  })
  salary: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Phụ cấp của giáo viên',
    example: 100000,
  })
  extra_allowance: number

  @IsNotEmpty()
  @IsEnum(TeacherSpecial)
  @ApiProperty({
    description: 'Đặc cách giáo viên',
    enum: TeacherSpecial,
    example: TeacherSpecial.LV1,
  })
  teacher_special: TeacherSpecial
}
