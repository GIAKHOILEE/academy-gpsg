import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { QuestionTypeHomework } from '@enums/homework.enum'
import { Type } from 'class-transformer'

export class CreateHomeworksDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Lesson ID',
    example: 1,
  })
  lesson_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Title',
    example: 'Homework 1',
  })
  title: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Description',
    example: 'Homework 1 description',
  })
  description: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Deadline Date',
    example: '20/12/2024',
  })
  deadline_date: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Deadline Time',
    example: '10:00',
  })
  deadline_time: string

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHomeworkQuestionDto)
  @ApiProperty({
    description: 'Questions',
    example: [
      {
        content: 'Question 1',
        type: QuestionTypeHomework.MCQ_SINGLE,
        points: 1,
        options: [
          { content: 'Option A', is_correct: true },
          { content: 'Option B', is_correct: false },
        ],
      },
      {
        content: 'Question 2',
        type: QuestionTypeHomework.MCQ_MULTI,
        points: 1,
        options: [
          { content: 'Option A', is_correct: true },
          { content: 'Option B', is_correct: true },
          { content: 'Option C', is_correct: false },
          { content: 'Option D', is_correct: false },
        ],
      },
      {
        content: 'Question 3',
        type: QuestionTypeHomework.ESSAY,
        points: 6,
      },
      {
        content: 'Question 4',
        type: QuestionTypeHomework.FILE,
        points: 1,
      },
    ],
    type: () => [CreateHomeworkQuestionDto],
  })
  questions: CreateHomeworkQuestionDto[]
}

export class CreateHomeworkQuestionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Question',
    example: 'Question 1',
  })
  content: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Question Type',
    example: QuestionTypeHomework.MCQ_SINGLE,
    enum: QuestionTypeHomework,
  })
  type: QuestionTypeHomework

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'điểm cho câu hỏi',
    example: 1,
  })
  points: number

  @IsOptional()
  @IsArray()
  @Type(() => CreateHomeworkOptionDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description: 'Options',
    type: () => [CreateHomeworkOptionDto],
  })
  options: CreateHomeworkOptionDto[]
}

export class CreateHomeworkOptionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Option',
    example: 'Option 1',
  })
  content: string

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: 'Is Correct',
    example: true,
    enum: [true, false],
  })
  is_correct: boolean
}
