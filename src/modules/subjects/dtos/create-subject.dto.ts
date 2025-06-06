import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tên môn học' })
  name: string

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Ảnh môn học' })
  image?: string
}
