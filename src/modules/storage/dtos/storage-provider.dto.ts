import { PaginationDto } from '@common/pagination'
import { StorageDriver, StorageStrategy } from '@enums/storage.enum'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateStorageProviderDto {
  @ApiProperty({ description: 'Tên dịch vụ cho người dùng đọc', example: 'R2 chính' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ enum: StorageDriver, description: 'Loại driver' })
  @IsEnum(StorageDriver)
  driver: StorageDriver

  @ApiPropertyOptional({ description: 'Chỉ dùng cho driver S3: id preset, ví dụ cloudflare_r2' })
  @IsOptional()
  @IsString()
  preset?: string

  @ApiProperty({
    description: 'Cấu hình theo schema của driver (key, secret, bucket...). Secret sẽ được mã hoá trước khi lưu.',
    example: { preset: 'cloudflare_r2', bucket: 'hvm', account_id: 'xxx', access_key_id: 'xxx', secret_access_key: 'xxx' },
  })
  @IsObject()
  config: Record<string, any>

  @ApiPropertyOptional({ description: 'Bật = được chọn để upload file mới', default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean

  @ApiPropertyOptional({ description: 'Đặt làm dịch vụ mặc định' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean

  @ApiPropertyOptional({ description: 'Số nhỏ = ưu tiên cao', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number

  @ApiPropertyOptional({ description: 'Trọng số cho chia tải round-robin', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number

  @ApiPropertyOptional({ description: 'Hạn mức bạn tự đặt (byte). Cần với dịch vụ S3 không có API quota.' })
  @IsOptional()
  @IsString()
  quota_limit_bytes?: string

  @ApiPropertyOptional({ description: 'Chặn file lớn hơn mức này (byte)' })
  @IsOptional()
  @IsString()
  max_file_size_bytes?: string

  @ApiPropertyOptional({ description: 'Mime được phép, cách nhau bởi dấu phẩy, hỗ trợ image/*' })
  @IsOptional()
  @IsString()
  allowed_mime_types?: string

  @ApiPropertyOptional({ description: 'Tiền tố thêm trước mọi key khi upload' })
  @IsOptional()
  @IsString()
  path_prefix?: string

  @ApiPropertyOptional({ description: 'Domain công khai để ghép link file' })
  @IsOptional()
  @IsString()
  public_base_url?: string
}

export class UpdateStorageProviderDto extends PartialType(CreateStorageProviderDto) {}

export class TestStorageProviderDto {
  @ApiProperty({ enum: StorageDriver })
  @IsEnum(StorageDriver)
  driver: StorageDriver

  @ApiProperty({ description: 'Cấu hình cần kiểm tra' })
  @IsObject()
  config: Record<string, any>

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public_base_url?: string

  @ApiPropertyOptional({
    description: 'Id provider đã lưu. Truyền kèm khi form đang giữ secret dạng che, để lấy secret thật từ DB.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provider_id?: number
}

export class ToggleStorageProviderDto {
  @ApiProperty({ description: 'true = bật nhận upload, false = chỉ đọc' })
  @IsBoolean()
  is_enabled: boolean
}

export class UpdateStorageSettingDto {
  @ApiPropertyOptional({ enum: StorageStrategy, description: 'Cách chọn dịch vụ khi nhiều dịch vụ cùng bật' })
  @IsOptional()
  @IsEnum(StorageStrategy)
  strategy?: StorageStrategy

  @ApiPropertyOptional({ description: 'Với priority_fill: dùng tới bao nhiêu % thì tràn sang dịch vụ sau' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  fill_threshold_percent?: number

  @ApiPropertyOptional({ description: 'Tự làm mới số liệu dung lượng theo chu kỳ' })
  @IsOptional()
  @IsBoolean()
  auto_refresh_usage?: boolean

  @ApiPropertyOptional({ description: 'Số phút giữa 2 lần tự làm mới dung lượng' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  usage_refresh_minutes?: number
}

export class PaginateStorageProviderDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StorageDriver })
  @IsOptional()
  @IsEnum(StorageDriver)
  driver?: StorageDriver

  @ApiPropertyOptional({ description: 'Tên dịch vụ cần tìm' })
  @IsOptional()
  @IsString()
  name?: string
}
