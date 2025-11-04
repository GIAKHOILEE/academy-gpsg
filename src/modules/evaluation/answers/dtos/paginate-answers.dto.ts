import { PaginationDto } from '@common/pagination'
import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginateAnswersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Class ID' })
  class_id?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Student ID' })
  student_id?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Semester ID' })
  semester_id?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Scholastic ID' })
  scholastic_id?: string
}
