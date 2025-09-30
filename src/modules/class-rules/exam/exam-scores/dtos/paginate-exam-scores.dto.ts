import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator'

export class PaginateExamScoresDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của lớp',
    example: 1,
  })
  @Type(() => Number)
  class_id?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID của học sinh',
    example: 1,
  })
  @Type(() => Number)
  student_id?: number
}
