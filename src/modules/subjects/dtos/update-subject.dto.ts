import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã môn học' })
  code: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên môn học' })
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
