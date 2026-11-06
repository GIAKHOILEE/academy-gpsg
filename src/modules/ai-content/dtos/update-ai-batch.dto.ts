import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdateAiBatchDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '2026-11-06', description: 'Ngày bắt đầu deadline mới' })
  start_day?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '2026-11-12', description: 'Ngày kết thúc deadline mới' })
  end_day?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Cập nhật tùy chọn gen ảnh cho các bài đang chờ' })
  is_image?: boolean

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Prompt cập nhật cho các bài đang chờ trong đợt', description: 'Nội dung prompt mới' })
  prompt?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Alias cho prompt' })
  promt?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  @ApiPropertyOptional({ example: 5, description: 'Khoảng thời gian chờ giữa các bài (phút)' })
  interval_minutes?: number
}

