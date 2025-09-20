import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateExamDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID của lớp',
    example: 1,
  })
  class_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên đề kiểm tra',
    example: 'Đề kiểm tra 15 phút',
  })
  name: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Tỷ lệ trọng số của đề kiểm tra',
    example: 0.3,
  })
  weight_percentage: number
}
