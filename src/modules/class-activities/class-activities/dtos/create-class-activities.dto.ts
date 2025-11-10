import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateClassActivitiesDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Tên hoạt động', example: 'Hoạt động 1' })
  title: string

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ description: 'URL của các file', example: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'], type: [String] })
  file_url: string[]

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Mô tả hoạt động', example: 'Mô tả hoạt động 1' })
  description: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Nội dung hoạt động', example: 'Nội dung hoạt động 1' })
  content: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID lớp', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID giáo viên', example: 1 })
  teacher_id: number
}
