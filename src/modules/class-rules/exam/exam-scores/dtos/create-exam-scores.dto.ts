import { IsArray, IsNotEmpty, IsNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateClassStudentScoreDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Class ID', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({
    description: 'Scores',
    example: [
      { student_id: 1, score: '10' },
      { student_id: 2, score: '20' },
    ],
  })
  scores: { student_id: number; score: string }[]
}

export class BulkExamScoreByStudentDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Class ID', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({
    description: 'Scores',
    example: [
      { student_id: 1, exam_id: 1, score: 10 },
      { student_id: 2, exam_id: 2, score: 20 },
    ],
  })
  scores: { student_id: number; exam_id: number; score: number }[]
}
