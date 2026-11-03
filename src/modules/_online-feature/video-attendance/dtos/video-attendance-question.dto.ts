import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator'
import { QuestionType } from '../video-attendance.logic'

export class CreateVideoAttendanceQuestionDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @ApiPropertyOptional({ description: 'Buổi học áp dụng; null = mọi buổi của lớp', nullable: true })
  lesson_id?: number | null

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({ description: 'Nội dung câu hỏi' })
  question: string

  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, description: 'CHOICE trắc nghiệm, TEXT tự luận ngắn' })
  type: QuestionType

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @ApiPropertyOptional({ description: 'Các lựa chọn (CHOICE)', example: ['A', 'B', 'C'] })
  options?: string[]

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Chỉ số lựa chọn đúng, tính từ 0 (CHOICE)' })
  correct_option?: number

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @ApiPropertyOptional({ description: 'Các đáp án chấp nhận (TEXT) — không phân biệt hoa thường/dấu', example: ['Giêsu'] })
  accepted_answers?: string[]

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Đang dùng' })
  is_active?: boolean
}

export class UpdateVideoAttendanceQuestionDto extends PartialType(CreateVideoAttendanceQuestionDto) {}

export class VideoAttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Lọc theo buổi học' })
  lesson_id?: number
}
