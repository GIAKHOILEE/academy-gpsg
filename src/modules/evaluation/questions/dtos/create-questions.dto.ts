import { QuestionType } from '@enums/evaluation.enum'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateQuestionsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Question of the question' })
  question: string

  @IsOptional()
  @IsArray()
  @ApiProperty({ description: 'Options of the question' })
  options: string[]

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Type of the question' })
  type: QuestionType
}
