import { PaginationDto } from '@common/pagination'
import { UserStatus } from '@enums/status.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateStudentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên sinh viên' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã sinh viên' })
  code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Số điện thoại' })
  phone_number?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Trạng thái 1: active, 2: inactive', enum: UserStatus })
  status?: UserStatus

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã thẻ của học viên' })
  card_code?: string
}
