import { UpdateUserDtoV2 } from '@modules/users/dtos/update-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateStudentsDto extends UpdateUserDtoV2 {
  @ApiPropertyOptional({ description: 'Mã sinh viên' })
  @IsString()
  @IsOptional()
  code: string

  @ApiPropertyOptional({ description: 'Ảnh 4x6' })
  @IsString()
  @IsOptional()
  image_4x6: string

  @ApiPropertyOptional({ description: 'Tài liệu bằng tốt nghiệp' })
  @IsString()
  @IsOptional()
  diploma_image: string

  @ApiPropertyOptional({ description: 'Tài liệu bảng điểm' })
  @IsString()
  @IsOptional()
  transcript_image: string

  @ApiPropertyOptional({ description: 'Tài liệu khác' })
  @IsString()
  @IsOptional()
  other_document: string

  @ApiPropertyOptional({ description: 'Tốt nghiệp' })
  @IsBoolean()
  @IsOptional()
  graduate: boolean

  @ApiPropertyOptional({ description: 'Năm tốt nghiệp' })
  @IsNumber()
  @IsOptional()
  graduate_year: number
}
