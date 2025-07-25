import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateVoucherDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The code of the voucher',
    example: '123456',
  })
  code: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the voucher',
    example: 'Voucher 1',
  })
  name: string
}
