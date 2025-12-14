import { PaginationDto } from '@common/pagination'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator'

export class PaginateDiscussDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'The lesson id of the discuss' })
  @Type(() => Number)
  lesson_id: number
}

export class PaginateChildDiscussDto extends PaginationDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'The parent id of the discuss' })
  @Type(() => Number)
  discuss_id: number
}
