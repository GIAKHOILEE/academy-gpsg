import { PaginationDto } from '@common/pagination'
import { PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { UserStatus } from '@enums/status.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class PaginateEnrollmentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã đăng ký' })
  code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên sinh viên' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Số điện thoại' })
  phone_number?: string

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({ description: 'Trạng thái thanh toán', enum: PaymentStatus })
  @Type(() => Number)
  payment_status?: PaymentStatus

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({ description: 'Phương thức thanh toán', enum: PaymentMethod })
  @Type(() => Number)
  payment_method?: PaymentMethod

  @IsOptional()
  @IsEnum(StatusEnrollment)
  @ApiPropertyOptional({ description: 'Trạng thái đăng ký', enum: StatusEnrollment })
  @Type(() => Number)
  status?: StatusEnrollment

  @IsOptional()
  @IsEnum(UserStatus)
  @ApiPropertyOptional({ description: 'Trạng thái đăng nhập', enum: UserStatus })
  @Type(() => Number)
  is_logged?: UserStatus
}
