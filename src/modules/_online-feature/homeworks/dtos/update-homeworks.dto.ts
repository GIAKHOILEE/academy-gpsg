import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { QuestionTypeHomework } from '@enums/homework.enum'
import { Type } from 'class-transformer'

export class UpdateHomeworksDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Lesson ID',
    example: 1,
  })
  lesson_id: number

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Is Active',
    example: true,
    enum: [true, false],
  })
  is_active?: boolean

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Is Final',
    example: false,
    enum: [true, false],
  })
  is_final?: boolean

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
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Total Points',
    example: 10,
    default: 10,
  })
  total_points: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Time Limit (seconds)',
    example: 3600,
  })
  time_limit: number

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
  @Type(() => UpdateHomeworkQuestionDto)
  @ApiProperty({
    description: 'Questions',
    type: () => [UpdateHomeworkQuestionDto],
  })
  questions: UpdateHomeworkQuestionDto[]
}

export class UpdateHomeworkQuestionDto {
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
  @Type(() => UpdateHomeworkOptionDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description: 'Options',
    type: () => [UpdateHomeworkOptionDto],
  })
  options: UpdateHomeworkOptionDto[]
}

export class UpdateHomeworkOptionDto {
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
