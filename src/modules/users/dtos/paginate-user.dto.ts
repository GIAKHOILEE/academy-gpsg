import { IsNumber, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { UserStatus } from '@enums/status.enum'

export class PaginateUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên đầy đủ' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Trạng thái 1: active, 2: inactive', enum: UserStatus })
  status?: UserStatus
}
