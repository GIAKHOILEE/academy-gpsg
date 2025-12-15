import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsNumber, ValidateNested, IsOptional, IsString } from 'class-validator'

export class SubmitAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ description: 'ID của câu hỏi' })
  question_id: number

  // nếu MCQ: mảng option id (có thể 1 phần tử cho MCQ single)
  // chỉ validate là mảng nếu property được gửi
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ApiProperty({ description: 'ID của các option được chọn (chỉ dùng cho MCQ)', required: false })
  selected_option_ids?: number[]

  // nếu ESSAY:
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đáp án của câu hỏi essay', required: false })
  answer_text?: string

  // nếu FILE: file
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'File của câu hỏi file', required: false })
  file?: string
}

export class SubmitHomeworkDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ description: 'ID của bài tập' })
  homework_id: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  @ApiProperty({
    description: 'Mảng các câu hỏi và đáp án',
    example: [
      { question_id: 1, selected_option_ids: [4] },
      { question_id: 2, selected_option_ids: [7, 9] },
      { question_id: 3, answer_text: 'Bài làm tự luận' },
      { question_id: 4, file: 'file.pdf' },
    ],
  })
  answers: SubmitAnswerDto[]
}
