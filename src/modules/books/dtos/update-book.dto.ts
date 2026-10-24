import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên giáo trình / sách', example: 'Giáo trình Toán cao cấp' })
  name?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã giáo trình / sách', example: 'GT-MATH-01' })
  code?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tác giả', example: 'PGS.TS Nguyễn Văn A' })
  author?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nhà xuất bản', example: 'NXB Giáo Dục' })
  publisher?: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Năm xuất bản', example: 2024 })
  publication_year?: number

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'URL ảnh bìa', example: 'https://example.com/cover.jpg' })
  image?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mô tả giáo trình / sách', example: 'Tài liệu dành cho sinh viên năm nhất' })
  description?: string
}
