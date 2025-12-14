import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateLessonDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The title of the lesson',
  })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The class id of the lesson',
  })
  class_id: number
}
