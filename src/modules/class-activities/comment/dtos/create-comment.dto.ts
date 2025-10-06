import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Nội dung bình luận', example: 'Bình luận của học sinh' })
  content: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID của hoạt động lớp học', example: 1 })
  class_activities_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID của học sinh', example: 1 })
  student_id: number
}
