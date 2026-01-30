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
}
