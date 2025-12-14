import { LearnType, PaymentMethod, StatusEnrollment } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateEnrollmentsDto {
  @ApiPropertyOptional({ description: 'Mã student', example: '123456' })
  @IsString()
  @IsOptional()
  student_code: string

  @ApiPropertyOptional({
    description: 'Mã lớp và hình thức học',
    example: [
      { class_id: 1, learn_type: 1 },
      { class_id: 2, learn_type: 3 },
    ],
  })
  @IsArray()
  @IsOptional()
  class_ids: { class_id: number; learn_type: LearnType }[]

  @ApiPropertyOptional({ description: 'Mã Voucher', example: 'VC_001' })
  @IsString()
  @IsOptional()
  voucher_code: string
  discount: number

  @ApiPropertyOptional({ description: 'Phương thức thanh toán', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method: PaymentMethod

  @ApiPropertyOptional({ description: 'Trạng thái đăng ký', enum: StatusEnrollment, example: StatusEnrollment.PENDING })
  @IsEnum(StatusEnrollment)
  @IsOptional()
  status: StatusEnrollment

  @ApiPropertyOptional({ description: 'Tiền đã đóng', example: 1000000 })
  @IsNumber()
  @IsOptional()
  prepaid: number

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note: string

  @ApiPropertyOptional({ description: 'User Ghi chú', example: 'user_note Ghi chú' })
  @IsString()
  @IsOptional()
  user_note: string

  @ApiPropertyOptional({ description: 'Đã đọc ghi chú', example: true })
  @IsBoolean()
  @IsOptional()
  is_read_note: boolean

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
