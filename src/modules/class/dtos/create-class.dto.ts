import { ClassStatus, Schedule } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mã lớp', example: 'ENG_v1' })
  code: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh lớp', example: 'https://example.com/image.jpg' })
  image: string

  @IsEnum(ClassStatus)
  @IsNotEmpty()
  @ApiProperty({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING, enum: ClassStatus })
  status: ClassStatus

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Phòng học', example: 'A101' })
  classroom: string

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Số lượng học sinh tối đa', example: 30 })
  max_students: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Giá lớp', example: 1000000 })
  price: number

  @IsArray()
  @IsEnum(Schedule, { each: true })
  @IsNotEmpty()
  @ApiProperty({
    enum: Schedule,
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
  @ApiProperty({ description: 'Niên khóa', example: 1 })
  scholastic_id: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Học kỳ', example: 1 })
  semester_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Khoa', example: 1 })
  department_id: number

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Link bài viết', example: 'https://example.com/post' })
  post_link: string
}
