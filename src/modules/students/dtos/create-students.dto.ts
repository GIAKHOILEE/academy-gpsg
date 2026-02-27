import { IFile } from '@common/file'
import { CreateUserDtoV2 } from '@modules/users/dtos/create-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateStudentsDto extends CreateUserDtoV2 {
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
      { id: 1, name: 'bằng tốt nghiệp 1', path: 'path/to/file' },
      { id: 2, name: 'bằng tốt nghiệp 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  diploma_image: IFile[]

  @ApiPropertyOptional({
    description: 'Tài liệu bảng điểm',
    example: [
      { id: 1, name: 'bảng điểm 1', path: 'path/to/file' },
      { id: 2, name: 'bảng điểm 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  transcript_image: IFile[]

  @ApiPropertyOptional({
    description: 'Tài liệu khác',
    example: [
      { id: 1, name: 'tài liệu 1', path: 'path/to/file' },
      { id: 2, name: 'tài liệu 2', path: 'path/to/file' },
    ],
  })
  @IsArray()
  @IsOptional()
  other_document: IFile[]

  @ApiPropertyOptional({ description: 'Đã lấy thẻ', default: false })
  @IsBoolean()
  @IsOptional()
  is_card_taken: boolean
}

export class CreateStudentWithEnrollmentDto extends CreateStudentsDto {}

// tạo mã thẻ của học viên
export class CreateStudentCardCodeDto {
  @ApiPropertyOptional({ description: 'ID user của học viên' })
  @IsNumber()
  @IsNotEmpty()
  user_id: number

  @ApiPropertyOptional({ description: 'Mã thẻ của học viên' })
  @IsString()
  @IsNotEmpty()
  card_code: string
}
