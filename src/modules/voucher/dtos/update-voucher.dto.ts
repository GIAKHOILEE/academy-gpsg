import { VoucherType } from '@enums/voucher.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateVoucherDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the voucher',
    example: 'Voucher 1',
  })
  name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The code of the voucher',
    example: '123456',
  })
  code: string

  @IsOptional()
  @IsEnum(VoucherType)
  @ApiPropertyOptional({
    description: 'The type of the voucher',
    example: VoucherType.PERCENTAGE,
  })
  type: VoucherType

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'The discount of the voucher',
    example: 10,
  })
  discount: number
}
