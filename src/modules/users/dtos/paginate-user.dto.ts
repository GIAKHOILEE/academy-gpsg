import { IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginateUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên đầy đủ', example: 'John Doe' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email', example: 'john.doe@example.com' })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Trạng thái', example: 'active' })
  status?: string
}
