import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'

export class RegisterSmsDeviceDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của thiết bị Android',
    example: 'android-sim-01',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'device_id chỉ được chứa chữ cái, chữ số, dấu gạch ngang (-) hoặc gạch dưới (_)',
  })
  device_id: string

  @ApiProperty({
    description: 'Tên gợi nhớ của thiết bị',
    example: 'Máy Samsung SIM Viettel Chính',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string

  @ApiPropertyOptional({
    description: 'Số điện thoại của SIM vật lý trên máy',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone_number?: string

  @ApiPropertyOptional({
    description: 'Giới hạn số lượng SMS gửi tối đa mỗi phút',
    example: 10,
    default: 10,
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
    default: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  daily_limit?: number
}
