import { CreateUserDtoV2 } from '@modules/users/dtos/create-user.dto'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateStudentsDto extends CreateUserDtoV2 {
  @ApiProperty({ description: 'Mã sinh viên' })
  @IsString()
  @IsNotEmpty()
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
