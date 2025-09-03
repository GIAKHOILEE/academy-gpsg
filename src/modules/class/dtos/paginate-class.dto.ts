import { PaginationDto } from '@common/pagination'
import { ClassStatus } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateClassDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên lớp' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã lớp' })
  code: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING, enum: ClassStatus })
  @IsEnum(ClassStatus)
  @Type(() => Number)
  status: ClassStatus

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id môn học' })
  @IsNumber()
  @Type(() => Number)
  subject_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id giáo viên' })
  @IsNumber()
  @Type(() => Number)
  teacher_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id niên khóa' })
  @IsNumber()
  @Type(() => Number)
  scholastic_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id học kỳ' })
  @IsNumber()
  @Type(() => Number)
  semester_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id khoa' })
  @IsNumber()
  @Type(() => Number)
  department_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo trạng thái đăng ký', example: true, type: Boolean })
  @IsBoolean()
  @Type(() => Boolean)
  is_register: boolean
}

export class GetStudentsOfClassDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên học sinh' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã học sinh' })
  code: string
}

export class PaginateClassOfStudentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên lớp' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã lớp' })
  code: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Phòng học' })
  classroom: string
}
