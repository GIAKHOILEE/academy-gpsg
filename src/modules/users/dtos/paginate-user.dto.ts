import { IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '@common/pagination'

export class PaginateUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  status?: string
}
