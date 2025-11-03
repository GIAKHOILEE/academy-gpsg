import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateAnswersDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Class ID' })
  class_id: number

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'Answers' })
  answers: AnswersDto[]
}

export class AnswersDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Question ID' })
  question_id: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'if question type is text, answer text' })
  answer_text: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'if question type is number, answer number' })
  answer_number: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'if question type is single choice, answer single choice' })
  answer_single_choice: number

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'if question type is multiple choice, answer multiple choice' })
  answer_multiple_choice?: number[]
}
