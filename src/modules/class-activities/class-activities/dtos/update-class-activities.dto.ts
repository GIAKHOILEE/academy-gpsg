import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateClassActivitiesDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên hoạt động', example: 'Hoạt động 1' })
  title?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'URL của các file',
    example: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
    type: [String],
  })
  file_url?: string[]

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mô tả hoạt động', example: 'Mô tả hoạt động 1' })
  description?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Nội dung hoạt động', example: 'Nội dung hoạt động 1' })
  content?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID lớp', example: 1 })
  class_id?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID giáo viên', example: 1 })
  teacher_id?: number
}
