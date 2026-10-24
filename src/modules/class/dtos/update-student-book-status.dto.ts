import { BookDeliveryStatus } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateStudentBookStatusDto {
  @IsEnum(BookDeliveryStatus)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Trạng thái nhận sách: 1 (Chưa gửi), 2 (Đang gửi / Đã gửi bưu điện), 3 (Đã nhận sách)',
    example: BookDeliveryStatus.RECEIVED,
    enum: BookDeliveryStatus,
  })
  book_status: BookDeliveryStatus

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ghi chú giao sách / Mã vận đơn bưu điện', example: 'VNPost: VN123456789' })
  book_delivery_note?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày nhận sách (YYYY-MM-DD)', example: '2026-10-24' })
  book_received_date?: string
}

export class UpdateClassBooksDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  @ApiProperty({ description: 'Danh sách ID các cuốn sách gán cho lớp', example: [1, 2], type: [Number] })
  book_ids: number[]
}
