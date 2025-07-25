import { PaymentMethod, StatusEnrollment } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateEnrollmentsDto {
  @ApiPropertyOptional({ description: 'Mã student', example: '123456' })
  @IsString()
  @IsOptional()
  student_code: string

  @ApiPropertyOptional({ description: 'Mã lớp', example: [1, 2, 3] })
  @IsArray()
  @IsOptional()
  class_ids: number[]

  @ApiPropertyOptional({ description: 'Mã Voucher', example: 'VC_001' })
  @IsString()
  @IsOptional()
  voucher_code: string
  discount: number

  @ApiPropertyOptional({ description: 'Phương thức thanh toán', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method: PaymentMethod

  // @ApiPropertyOptional({ description: 'Trạng thái thanh toán', enum: PaymentStatus, example: PaymentStatus.UNPAID })
  // @IsEnum(PaymentStatus)
  // @IsOptional()
  // payment_status: PaymentStatus

  @ApiPropertyOptional({ description: 'Trạng thái đăng ký', enum: StatusEnrollment, example: StatusEnrollment.PENDING })
  @IsEnum(StatusEnrollment)
  @IsOptional()
  status: StatusEnrollment

  // @ApiPropertyOptional({ description: 'Tổng học phí', example: 1000000 })
  // @IsNumber()
  // @IsOptional()
  // total_fee: number

  @ApiPropertyOptional({ description: 'Tiền đã đóng', example: 1000000 })
  @IsNumber()
  @IsOptional()
  prepaid: number

  // @ApiPropertyOptional({ description: 'Tiền nợ', example: 1000000 })
  // @IsNumber()
  // @IsOptional()
  // debt: number

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note: string

  @ApiPropertyOptional({ description: 'User Ghi chú', example: 'user_note Ghi chú' })
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
