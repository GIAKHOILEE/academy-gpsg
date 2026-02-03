import { IFile } from '@common/file'
import { UpdateUserDtoV2 } from '@modules/users/dtos/update-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateStudentsDto extends UpdateUserDtoV2 {
  @ApiPropertyOptional({ description: 'Mã thẻ của học viên' })
  @IsString()
  @IsOptional()
  card_code: string

  @ApiPropertyOptional({ description: 'Ảnh 4x6' })
  @IsString()
  @IsOptional()
  image_4x6: string

  @ApiPropertyOptional({
    description: 'Tài liệu bằng tốt nghiệp',
    example: [
      { name: 'bằng tốt nghiệp 1', path: 'pa  th/to/file' },
      { name: 'bằng tốt nghiệp 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  diploma_image: IFile[]

  @ApiPropertyOptional({
    description: 'Tài liệu bảng điểm',
    example: [
      { name: 'bảng điểm 1', path: 'path/to/file' },
      { name: 'bảng điểm 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  transcript_image: IFile[]

  @ApiPropertyOptional({
    description: 'Tài liệu khác',
    example: [
      { name: 'tài liệu 1', path: 'path/to/file' },
      { name: 'tài liệu 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  other_document: IFile[]

  @ApiPropertyOptional({ description: 'Tốt nghiệp' })
  @IsBoolean()
  @IsOptional()
  graduate: boolean

  @ApiPropertyOptional({ description: 'Năm tốt nghiệp' })
  @IsNumber()
  @IsOptional()
  graduate_year: number

  @ApiPropertyOptional({ description: 'Đã lấy thẻ', default: false })
  @IsBoolean()
  @IsOptional()
  is_card_taken: boolean
}

// cập nhật mã thẻ của học viên
export class UpdateStudentCardCodeDto {
  @ApiPropertyOptional({ description: 'ID user của học viên' })
  @IsNumber()
  @IsNotEmpty()
  user_id: number

  @ApiPropertyOptional({ description: 'Mã thẻ của học viên' })
  @IsString()
  @IsNotEmpty()
  card_code: string
}
