import { PaginationDto } from '@common/pagination'
import { StorageFileKind } from '@enums/storage.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class PaginateStorageFileDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Lọc theo dịch vụ lưu trữ' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provider_id?: number

  @ApiPropertyOptional({ description: 'Lọc theo thư mục. Không truyền = toàn bộ, truyền 0 = thư mục gốc.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  folder_id?: number

  @ApiPropertyOptional({ enum: StorageFileKind, description: 'Lọc theo nhóm loại file' })
  @IsOptional()
  @IsEnum(StorageFileKind)
  kind?: StorageFileKind

  @ApiPropertyOptional({ description: 'Tìm theo tên file' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ description: 'true = chỉ lấy file chưa thấy dùng ở đâu (ứng viên để dọn)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unused_only?: boolean
}

export class UploadStorageFileDto {
  @ApiPropertyOptional({ description: 'Upload vào dịch vụ này. Không truyền thì hệ thống tự chọn theo chiến lược chia tải.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provider_id?: number

  @ApiPropertyOptional({ description: 'Upload vào thư mục này' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  folder_id?: number

  @ApiPropertyOptional({
    description:
      'Thư mục theo đường dẫn, tự tạo nếu chưa có. Dùng khi chưa biết trước file sẽ vào dịch vụ nào (vd "pdf", "avatar"). Bị bỏ qua nếu đã truyền folder_id.',
  })
  @IsOptional()
  @IsString()
  folder_path?: string
}

export class RenameStorageFileDto {
  @ApiProperty({ description: 'Tên mới của file (kèm phần mở rộng)' })
  @IsString()
  @IsNotEmpty()
  name: string
}

export class MoveStorageFileDto {
  @ApiPropertyOptional({ description: 'Thư mục đích trong cùng dịch vụ. Không truyền = chuyển về thư mục gốc.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  folder_id?: number
}

export class BulkDeleteStorageFileDto {
  @ApiProperty({ description: 'Danh sách id file cần xoá', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[]

  @ApiPropertyOptional({
    description: 'true = xoá cả khi file đang được dùng ở đâu đó. Mặc định false để tránh làm hỏng dữ liệu đang hiển thị.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean
}

export class ScanStorageProviderDto {
  @ApiPropertyOptional({ description: 'Chỉ quét trong thư mục / prefix này' })
  @IsOptional()
  @IsString()
  prefix?: string

  @ApiPropertyOptional({ description: 'Quét cả thư mục con', default: true })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean

  @ApiPropertyOptional({ description: 'Số object tối đa cho một lần quét', default: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number
}

export class CreateStorageFolderDto {
  @ApiProperty({ description: 'Dịch vụ chứa thư mục' })
  @Type(() => Number)
  @IsInt()
  provider_id: number

  @ApiProperty({ description: 'Tên thư mục' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional({ description: 'Thư mục cha. Không truyền = tạo ở gốc.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number
}

export class RenameStorageFolderDto {
  @ApiProperty({ description: 'Tên mới của thư mục' })
  @IsString()
  @IsNotEmpty()
  name: string
}
