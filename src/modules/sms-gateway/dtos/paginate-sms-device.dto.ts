import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { SmsDeviceStatus } from '../entities/sms-device.entity'

export class PaginateSmsDeviceDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái kết nối ONLINE / OFFLINE',
    enum: SmsDeviceStatus,
  })
  @IsOptional()
  @IsEnum(SmsDeviceStatus)
  status?: SmsDeviceStatus

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo device_id',
  })
  @IsOptional()
  @IsString()
  device_id?: string

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên thiết bị',
  })
  @IsOptional()
  @IsString()
  name?: string
}
