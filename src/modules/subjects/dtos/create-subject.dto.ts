import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateSubjectDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID khoa' })
  department_id: number

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mã môn học' })
  code: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tên môn học' })
  name: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ảnh môn học' })
  image?: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Số tín chỉ' })
  credit?: number

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mô tả môn học' })
  description?: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nội dung môn học' })
  content?: string
}
