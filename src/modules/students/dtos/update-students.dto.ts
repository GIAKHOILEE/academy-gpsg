import { UpdateUserDto } from '@modules/users/dtos/update-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateStudentsDto extends UpdateUserDto {
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
}
