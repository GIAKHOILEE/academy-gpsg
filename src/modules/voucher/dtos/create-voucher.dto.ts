import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { VoucherType } from '@enums/voucher.enum'

export class CreateVoucherDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The name of the voucher',
    example: 'Voucher 1',
  })
  name: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The code of the voucher',
    example: '123456',
  })
  code: string

  @IsNotEmpty()
  @IsEnum(VoucherType)
  @ApiProperty({
    description: 'The type of the voucher',
    example: VoucherType.PERCENTAGE,
  })
  type: VoucherType

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'The discount of the voucher',
    example: 10,
  })
  discount: number
}
