import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBooleanString, IsOptional, IsString } from 'class-validator'

export class PaginateHomeworksDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The lesson id of the homework',
  })
  lesson_id: number

  @IsOptional()
  @IsBooleanString()
  @ApiPropertyOptional({ description: 'filter theo trạng thái', example: true, type: Boolean })
  is_active: string
}

export class PaginateSubmissionsDto extends PaginationDto {
  // @IsOptional()
  // @IsString()
  // @ApiPropertyOptional({
  //   description: 'The homework id of the submission',
  // })
  // homework_id: number
}
