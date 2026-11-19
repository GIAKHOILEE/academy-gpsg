import { IsNumber, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { UserStatus } from '@enums/status.enum'

export class PaginateUserDto extends PaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên đầy đủ' })
  full_name?: string

  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên' })
  first_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Trạng thái 1: active, 2: inactive', enum: UserStatus })
  status?: UserStatus
}
