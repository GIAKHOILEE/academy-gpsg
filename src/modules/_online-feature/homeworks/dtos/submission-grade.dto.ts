import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class GradeAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID của câu trả lời' })
  answer_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Điểm của câu trả lời' })
  score: number

  @IsOptional()
  // feedback optional
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Feedback của câu hỏi', required: false })
  feedback?: string
}

export class GradeSubmissionDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID của bài nộp' })
  submission_id: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  @ApiProperty({ type: [GradeAnswerDto], description: 'Danh sách câu trả lời' })
  answers: GradeAnswerDto[]

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Feedback chung cho toàn bộ bài nộp', required: false })
  feedback?: string

  @IsOptional()
  @IsArray()
  @ApiProperty({
    description: 'Danh sách đính kèm (ảnh, file, link...) của giảng viên cho toàn bài',
    required: false,
    example: [
      { name: 'nhan-xet.pdf', url: 'https://...', type: 'file' },
      { name: 'anh-minh-hoa.png', url: 'https://...', type: 'image' },
      { name: 'link-tham-khao', url: 'https://...', type: 'link' },
    ],
  })
  feedback_attachments?: any[]
}
