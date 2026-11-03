import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'

export class CreateSmsJobDto {
  @ApiProperty({
    description: 'Số điện thoại người nhận (3-15 chữ số, có thể bắt đầu bằng dấu +)',
    example: '0901234567',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  @Matches(/^\+?[0-9\s\-().]{3,20}$/, {
    message: 'Số điện thoại người nhận không hợp lệ',
  })
  recipient: string

  @ApiProperty({
    description: 'Nội dung tin nhắn SMS (tối đa 1500 ký tự)',
    example: 'Học viện thông báo: Mã xác nhận đăng ký của bạn là 482910.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1500)
  message: string

  @ApiPropertyOptional({
    description: 'Khóa chống gửi trùng (idempotency key) từ phía website/client',
    example: 'enrollment-1024-confirm-sms',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotency_key?: string

  @ApiPropertyOptional({
    description: 'Độ ưu tiên của tin nhắn (số lớn hơn được ưu tiên gửi trước)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-10)
  @Max(100)
  priority?: number

  @ApiPropertyOptional({
    description: 'Dữ liệu ngữ cảnh đính kèm (ví dụ: enrollmentId, studentId)',
    example: { module: 'enrollments', enrollmentId: 1024 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
