import { IsOptional, IsString } from 'class-validator'
import { PaginationParams } from '@common/pagination'

export class PaginateUserDto extends PaginationParams {
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
