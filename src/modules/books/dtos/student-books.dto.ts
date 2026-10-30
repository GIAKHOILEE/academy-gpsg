import { PaginationDto } from '@common/pagination'
import { BookDeliveryStatus } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateStudentBookDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Lọc theo ID học sinh' })
  student_id?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Lọc theo ID sách / giáo trình' })
  book_id?: number

  @IsOptional()
  @IsEnum(BookDeliveryStatus)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Trạng thái giao sách: 1 (Chưa gửi), 2 (Đang gửi / Đã gửi bưu điện), 3 (Đã nhận sách)',
    enum: BookDeliveryStatus,
  })
  book_status?: BookDeliveryStatus

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo họ tên học sinh' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo mã học sinh' })
  code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo số điện thoại học sinh' })
  phone_number?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo tên sách / giáo trình' })
  book_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo mã sách / giáo trình' })
  book_code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm theo địa chỉ nhận sách' })
  shipping_address?: string
}

export class CreateStudentBookDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID học sinh', example: 1 })
  student_id: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID sách / giáo trình', example: 1 })
  book_id: number

  @IsEnum(BookDeliveryStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Trạng thái nhận sách: 1 (Chưa gửi), 2 (Đang gửi / Đã gửi bưu điện), 3 (Đã nhận sách)',
    example: BookDeliveryStatus.NOT_SENT,
    enum: BookDeliveryStatus,
  })
  book_status?: BookDeliveryStatus

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Địa chỉ nhận sách mới', example: '123 Nguyễn Trãi, Q.1, TP.HCM' })
  shipping_address?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ghi chú giao sách / Mã vận đơn bưu điện', example: 'VNPost: VN123456789' })
  book_delivery_note?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày nhận sách (YYYY-MM-DD)', example: '2026-10-30' })
  book_received_date?: string
}

export class UpdateStudentBookDto {
  @IsEnum(BookDeliveryStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Trạng thái nhận sách: 1 (Chưa gửi), 2 (Đang gửi / Đã gửi bưu điện), 3 (Đã nhận sách)',
    example: BookDeliveryStatus.RECEIVED,
    enum: BookDeliveryStatus,
  })
  book_status?: BookDeliveryStatus

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Địa chỉ nhận sách mới', example: '123 Nguyễn Trãi, Q.1, TP.HCM' })
  shipping_address?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ghi chú giao sách / Mã vận đơn bưu điện', example: 'VNPost: VN123456789' })
  book_delivery_note?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày nhận sách (YYYY-MM-DD)', example: '2026-10-30' })
  book_received_date?: string
}

