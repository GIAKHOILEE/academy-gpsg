import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ClassStudentScoreDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Student ID', example: 1 })
  student_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Score', example: 8.5 })
  score: string
}

export class UpdateClassStudentScoreDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Class ID', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({
    description: 'Scores',
    type: [ClassStudentScoreDto],
  })
  scores: ClassStudentScoreDto[]
}
