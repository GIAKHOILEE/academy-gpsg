import { PaginationDto } from '@common/pagination'
import { ClassStatus } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateClassDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên lớp', example: 'Lớp tiếng anh sơ cấp' })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã lớp', example: 'ENG_v1' })
  code: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING, enum: ClassStatus })
  @IsEnum(ClassStatus)
  status: ClassStatus

  @IsOptional()
  @ApiPropertyOptional({ description: 'Môn học', example: 1 })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  subject_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'Giáo viên', example: 1 })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  teacher_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'Khoa', example: 1 })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  department_id: number
}
