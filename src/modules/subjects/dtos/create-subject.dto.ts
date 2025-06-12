import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateSubjectDto {
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

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mô tả môn học' })
  description?: string
}
