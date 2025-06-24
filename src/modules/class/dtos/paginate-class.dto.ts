import { PaginationDto } from '@common/pagination'
import { ClassStatus } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

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
  status: ClassStatus

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id môn học' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  subject_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id giáo viên' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  teacher_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id niên khóa' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  scholastic_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id học kỳ' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  semester_id: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo id khoa' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  department_id: number
}
