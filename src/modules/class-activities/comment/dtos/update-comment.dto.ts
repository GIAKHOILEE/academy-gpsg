import { IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Nội dung bình luận', example: 'Bình luận của học sinh' })
  content: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID của hoạt động lớp học', example: 1 })
  class_activities_id: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID của học sinh', example: 1 })
  student_id: number
}
