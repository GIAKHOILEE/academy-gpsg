import { AiModuleType } from '@enums/ai-content.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'

export class AiDeadlineDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '2026-11-06', description: 'Ngày bắt đầu gen content (YYYY-MM-DD hoặc DD/MM/YYYY)' })
  start_day?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '2026-11-10', description: 'Ngày kết thúc gen content (YYYY-MM-DD hoặc DD/MM/YYYY)' })
  end_day?: string
}

export class BaseCreateAiBatchDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: '2026-11-06', description: 'Ngày bắt đầu deadline gen content (YYYY-MM-DD hoặc DD/MM/YYYY)' })
  start_day?: string

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '2026-11-10', description: 'Ngày kết thúc deadline gen content (YYYY-MM-DD hoặc DD/MM/YYYY)' })
  end_day?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AiDeadlineDto)
  @ApiPropertyOptional({
    type: AiDeadlineDto,
    description: 'Object deadline { start_day, end_day } (hỗ trợ truyền trực tiếp start_day/end_day hoặc qua object deadline/dealine)',
  })
  deadline?: AiDeadlineDto

  @IsOptional()
  @ValidateNested()
  @Type(() => AiDeadlineDto)
  @ApiPropertyOptional({
    type: AiDeadlineDto,
    description: 'Alias cho deadline { start_day, end_day }',
  })
  dealine?: AiDeadlineDto

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @ApiProperty({ example: 5, description: 'Số lượng bài viết cần AI gen trong khoảng deadline' })
  quantity: number

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return true
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: true, default: true, description: 'Tùy chọn có gen ảnh cho bài viết hay không' })
  is_image?: boolean = true

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Viết chuỗi bài sâu sắc về đời sống đức tin, lòng bác ái và sự kiên vững trong thử thách',
    description: 'Prompt hướng dẫn AI tạo danh sách bài viết theo nội dung mong muốn',
  })
  prompt?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Viết chuỗi bài sâu sắc về đời sống đức tin',
    description: 'Alias cho trường prompt',
  })
  promt?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  @ApiPropertyOptional({
    example: 5,
    description: 'Khoảng cách thời gian (phút) chờ giữa các lần gen tính từ lúc bài cuối cùng gen xong (mặc định 5 phút)',
  })
  interval_minutes?: number
}

export class CreateStoryAiBatchDto extends BaseCreateAiBatchDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 1, description: 'ID chủ đề (topic_id) của module Story' })
  topic_id: number
}

export class CreateWitnessFaithAiBatchDto extends BaseCreateAiBatchDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 1, description: 'ID menu (witness_faith_menu_id) của module Witness Faiths' })
  witness_faith_menu_id: number
}

export class CreatePostCatalogTopAiBatchDto extends BaseCreateAiBatchDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 1, description: 'ID danh mục bài viết top (post_catalog_id thuộc post-catalog-top)' })
  post_catalog_id: number
}

export class CreateAiBatchDto extends BaseCreateAiBatchDto {
  @IsNotEmpty()
  @IsEnum(AiModuleType)
  @ApiProperty({ enum: AiModuleType, example: AiModuleType.STORY, description: 'Module cần tạo nội dung AI hàng loạt' })
  module_type: AiModuleType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'ID danh mục đích (topic_id, witness_faith_menu_id hoặc post_catalog_id)' })
  category_id?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'ID chủ đề Story (nếu module_type = story)' })
  topic_id?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'ID menu Witness Faith (nếu module_type = witness-faiths)' })
  witness_faith_menu_id?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'ID danh mục Post Catalog Top (nếu module_type = post-catalog-top)' })
  post_catalog_id?: number
}

