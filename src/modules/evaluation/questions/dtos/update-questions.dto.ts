import { QuestionType } from '@enums/evaluation.enum'
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateQuestionsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Question of the question' })
  question: string

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'Options of the question' })
  options: string[]

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Type of the question' })
  type: QuestionType
}
