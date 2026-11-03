import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { SmsJobStatus } from '../entities/sms-job.entity'

export class PaginateSmsJobDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái xử lý SMS Job',
    enum: SmsJobStatus,
  })
  @IsOptional()
  @IsEnum(SmsJobStatus)
  status?: SmsJobStatus

  @ApiPropertyOptional({
    description: 'Lọc theo mã thiết bị (device_id)',
  })
  @IsOptional()
  @IsString()
  device_id?: string

  @ApiPropertyOptional({
    description: 'Tìm theo số điện thoại người nhận',
  })
  @IsOptional()
  @IsString()
  recipient?: string

  @ApiPropertyOptional({
    description: 'Tìm theo mã định danh job_uid',
  })
  @IsOptional()
  @IsString()
  job_uid?: string
}
