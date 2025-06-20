import { ClassStatus, Schedule, Semester } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tên lớp', example: 'Lớp tiếng anh sơ cấp' })
  name: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mã lớp', example: 'ENG_v1' })
  code: string

  @IsEnum(ClassStatus)
  @IsNotEmpty()
  @ApiProperty({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING })
  status: ClassStatus

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Phòng học', example: 'A101' })
  classroom: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Niên khóa', example: '2025-2026' })
  scholastic: string

  @IsEnum(Semester)
  @IsNotEmpty()
  @ApiProperty({ description: 'Học kỳ', example: Semester.FIRST })
  semester: Semester

  @IsArray()
  @IsEnum(Schedule, { each: true })
  @IsNotEmpty()
  @ApiProperty({
    description: 'Lịch học',
    example: [Schedule.SUNDAY, Schedule.MONDAY, Schedule.TUESDAY, Schedule.WEDNESDAY, Schedule.THURSDAY, Schedule.FRIDAY, Schedule.SATURDAY],
  })
  schedule: Schedule[]

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
  @IsNotEmpty()
  @ApiProperty({ description: 'Môn học', example: 1 })
  subject_id: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Giáo viên', example: 1 })
  teacher_id: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Khoa', example: 1 })
  department_id: number
}
