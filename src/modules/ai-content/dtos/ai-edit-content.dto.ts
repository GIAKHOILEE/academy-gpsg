import { AiModuleType } from '@enums/ai-content.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

export class AiEditContentDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Đổi màu đoạn này sang màu xanh dương, căn giữa và viết lại cho sâu sắc, cảm xúc hơn',
    description: 'Yêu cầu chỉnh sửa cho AI (đổi màu, đổi nội dung đoạn, đổi căn lề, đổi cỡ chữ, rút gọn/mở rộng...)',
  })
  prompt?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Đổi màu đoạn mở đầu sang đỏ đô và căn giữa',
    description: 'Alias của prompt (hỗ trợ cả promt)',
  })
  promt?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Viết lại đoạn văn này ngắn gọn hơn và tô màu nâu đỏ',
    description: 'Alias của prompt (instruction)',
  })
  instruction?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '<p style="text-align: justify;"><span style="font-size: 20px;">Đoạn văn cần AI sửa...</span></p>',
    description:
      'Đoạn HTML hoặc văn bản mà Admin đang bôi đen/chọn trên trình soạn thảo để AI sửa riêng đoạn đó. Nếu bỏ trống, AI sẽ sửa trên toàn bài viết theo prompt.',
  })
  selected_html?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Đoạn văn cần AI sửa...',
    description: 'Văn bản thuần (plain text) mà Admin đang bôi đen trên trình soạn thảo (nếu FE không lấy HTML vùng chọn)',
  })
  selected_text?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Toàn bộ nội dung HTML hiện tại trên Editor của FE. Nếu gọi API theo ID bài viết mà không truyền field này, hệ thống tự lấy content đang lưu trong DB.',
  })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tiêu đề hiện tại của bài viết (nếu muốn AI chỉnh sửa luôn tiêu đề)',
  })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Mô tả ngắn hiện tại của bài viết (nếu muốn AI chỉnh sửa luôn mô tả)',
  })
  description?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'rgb(0, 85, 255)',
    description:
      'Tùy chọn đổi màu chữ nhanh (nhận mã HEX #cc0000, rgb(204,0,0) hoặc tên màu tiếng Việt: "đỏ đô", "xanh dương", "xanh ngọc", "nâu đỏ", "xanh lá", "tím", "đen")',
  })
  text_color?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '#fdfaf6',
    description: 'Tùy chọn đổi màu nền (highlight / background) cho đoạn văn hoặc khung trích dẫn',
  })
  background_color?: string

  @IsOptional()
  @IsString()
  @IsIn(['left', 'center', 'right', 'justify'])
  @ApiPropertyOptional({
    enum: ['left', 'center', 'right', 'justify'],
    example: 'justify',
    description: 'Tùy chọn đổi căn lề nhanh: left (trái), center (giữa), right (phải), justify (căn đều 2 bên)',
  })
  text_align?: 'left' | 'center' | 'right' | 'justify'

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '20px',
    description: 'Tùy chọn đổi cỡ chữ nhanh (ví dụ: "18px", "20px", "22px", "24px", "30px" hoặc "22")',
  })
  font_size?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Tùy chọn in đậm (true: bọc <strong>, false: bỏ in đậm)' })
  bold?: boolean

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Tùy chọn in nghiêng (true: bọc <em>, false: bỏ in nghiêng)' })
  italic?: boolean

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Tùy chọn gạch chân (true: bọc <u>, false: bỏ gạch chân)' })
  underline?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    example: 1,
    description: 'ID bài viết AI trong bảng ai_content_items (dùng khi gọi endpoint chung POST /admin/ai-content/ai-edit)',
  })
  article_id?: number

  @IsOptional()
  @IsEnum(AiModuleType)
  @ApiPropertyOptional({
    enum: AiModuleType,
    example: AiModuleType.POST_CATALOG_TOP,
    description: 'Loại module (dùng kèm target_record_id khi sửa trực tiếp bản ghi trong bảng stories / witness_faiths / posts)',
  })
  module_type?: AiModuleType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    example: 3233,
    description: 'ID bản ghi thực tế trong bảng stories / witness_faiths / posts',
  })
  target_record_id?: number

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 1
  })
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Mặc định true: tự động lưu nội dung sau khi AI sửa vào DB và đồng bộ sang module. Truyền false nếu FE chỉ muốn lấy kết quả HTML để xem trước (preview) trên Editor trước khi bấm Lưu.',
  })
  auto_save?: boolean
}

