import { ClassStatus, Semester } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên lớp', example: 'Lớp tiếng anh sơ cấp' })
  name: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã lớp', example: 'ENG_v1' })
  code: string

  @IsEnum(ClassStatus)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING })
  status: ClassStatus

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Phòng học', example: 'A101' })
  classroom: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Niên khóa', example: '2025-2026' })
  scholastic: string

  @IsEnum(Semester)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Học kỳ', example: Semester.FIRST })
  semester: Semester

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày khai giảng', example: '2025-01-01' })
  opening_day: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày kết thúc', example: '2025-01-01' })
  closing_day: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Môn học', example: 1 })
  subject_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo viên', example: 1 })
  teacher_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Khoa', example: 1 })
  department_id: number
}
