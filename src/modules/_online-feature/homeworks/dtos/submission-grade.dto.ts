import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class GradeAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID của câu hỏi' })
  answer_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Điểm của câu hỏi' })
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
  answers: GradeAnswerDto[]
}
