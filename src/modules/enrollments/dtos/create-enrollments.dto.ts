import { PaymentMethod } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateEnrollmentsDto {
  @ApiProperty({ description: 'Mã lớp', example: [1, 2, 3] })
  @IsArray()
  @IsNotEmpty()
  class_ids: number[]

  @ApiPropertyOptional({ description: 'Mã Voucher', example: 'VC_001' })
  @IsString()
  @IsOptional()
  voucher_code: string
  discount: number

  @ApiProperty({ description: 'Phương thức thanh toán', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method: PaymentMethod

  @ApiPropertyOptional({ description: 'Ghi chú', required: false, example: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note: string

  @ApiPropertyOptional({ description: 'User Ghi chú', required: false, example: 'user_note Ghi chú' })
  @IsString()
  @IsOptional()
  user_note: string

  // thông tin sinh viên
  @ApiPropertyOptional({ description: 'Tên thánh', example: 'Tên thánh' })
  @IsString()
  @IsOptional()
  saint_name: string

  @ApiPropertyOptional({ description: 'Tên sinh viên', example: 'Tên sinh viên' })
  @IsString()
  @IsOptional()
  full_name: string

  @ApiPropertyOptional({ description: 'Email', example: 'Email' })
  @IsString()
  @IsOptional()
  email: string

  @ApiPropertyOptional({ description: 'Số điện thoại', example: 'Số điện thoại' })
  @IsString()
  @IsOptional()
  phone_number: string

  @ApiPropertyOptional({ description: 'Ngày sinh', example: 'Ngày sinh' })
  @IsString()
  @IsOptional()
  birth_date: string

  @ApiPropertyOptional({ description: 'Địa chỉ', example: 'Địa chỉ' })
  @IsString()
  @IsOptional()
  address: string

  @ApiPropertyOptional({ description: 'Nơi sinh', example: 'Nơi sinh' })
  @IsString()
  @IsOptional()
  birth_place: string

  @ApiPropertyOptional({ description: 'Giáo xứ', example: 'Giáo xứ' })
  @IsString()
  @IsOptional()
  parish: string

  @ApiPropertyOptional({ description: 'Giáo hat', example: 'Giáo hat' })
  @IsString()
  @IsOptional()
  deanery: string

  @ApiPropertyOptional({ description: 'Giáo phận', example: 'Giáo phận' })
  @IsString()
  @IsOptional()
  diocese: string

  @ApiPropertyOptional({ description: 'Dòng tu', example: 'Dòng tu' })
  @IsString()
  @IsOptional()
  congregation: string
}
