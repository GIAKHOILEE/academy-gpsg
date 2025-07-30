import { ClassStatus, Schedule } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã lớp', example: 'ENG_v1' })
  code: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Số lượng học sinh tối đa', example: 30 })
  max_students: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giá lớp', example: 1000000 })
  price: number

  @IsEnum(ClassStatus)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING })
  status: ClassStatus

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Phòng học', example: 'A101' })
  classroom: string

  @IsArray()
  @IsEnum(Schedule, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Lịch học',
    example: [Schedule.SUNDAY, Schedule.MONDAY, Schedule.TUESDAY, Schedule.WEDNESDAY, Schedule.THURSDAY, Schedule.FRIDAY, Schedule.SATURDAY],
  })
  schedule: Schedule[]

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Điều kiện vào lớp', example: 'có bằng sơ cấp' })
  condition: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày kết thúc ghi danh', example: '2025-01-01' })
  end_enrollment_day: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giờ bắt đầu vào học', example: '08:00' })
  start_time: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Giờ kết thúc học', example: '17:00' })
  end_time: string

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
  @ApiPropertyOptional({ description: 'Niên khóa', example: 1 })
  scholastic_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Học kỳ', example: 1 })
  semester_id: number

  // @IsNumber()
  // @IsOptional()
  // @ApiPropertyOptional({ description: 'Khoa', example: 1 })
  // department_id: number
}
