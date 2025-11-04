import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateAnswersDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Class ID', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({
    description: 'Answers',
    example: [
      { question_id: 1, answer_text: 'answer text' },
      { question_id: 2, answer_number: 1 },
      { question_id: 3, answer_single_choice: 1 },
      { question_id: 4, answer_multiple_choice: [1, 2] },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => AnswersDto)
  answers: AnswersDto[]
}

export class AnswersDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Question ID', example: 1 })
  question_id: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'if question type is text, answer text', example: 'answer text' })
  answer_text: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'if question type is number, answer number', example: 1 })
  answer_number: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'if question type is single choice, answer single choice', example: 1 })
  answer_single_choice: number

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'if question type is multiple choice, answer multiple choice', example: [1, 2] })
  answer_multiple_choice: number[]
}
