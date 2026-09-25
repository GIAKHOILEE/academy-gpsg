import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ClassSpecial } from '@enums/class.enum'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'

export class UpdateTeacherSalaryDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của lớp',
    example: 1,
  })
  class_id: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của giáo viên',
    example: 1,
  })
  teacher_id?: number

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

  @IsOptional()
  @IsEnum(ClassSpecial)
  @ApiPropertyOptional({
    description: 'Đặc cách lớp học (tính lương giáo viên)',
    enum: ClassSpecial,
    example: ClassSpecial.LV1,
  })
  special?: ClassSpecial

  // field cũ của FE, cái field mới là special, giờ chỉ để cho tương thích ngược
  @IsOptional()
  @IsEnum(ClassSpecial)
  @ApiPropertyOptional({
    description: 'Đặc cách lớp học (legacy key)',
    enum: ClassSpecial,
    example: ClassSpecial.LV1,
  })
  teacher_special?: ClassSpecial
}

