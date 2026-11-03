import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateSmsDeviceDto {
  @ApiPropertyOptional({
    description: 'Tên gợi nhớ của thiết bị',
    example: 'Máy Samsung SIM Viettel Chính',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({
    description: 'Số điện thoại của SIM vật lý trên máy',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone_number?: string

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt thiết bị (false sẽ ngắt kết nối thiết bị ngay lập tức)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean

  @ApiPropertyOptional({
    description: 'Giới hạn số lượng SMS gửi tối đa mỗi phút',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  rate_limit_per_minute?: number

  @ApiPropertyOptional({
    description: 'Giới hạn số lượng SMS gửi tối đa mỗi ngày',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  daily_limit?: number
}
