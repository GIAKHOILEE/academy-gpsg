import { IFile } from '@common/file'
import { TeacherSpecial } from '@enums/user.enum'
import { UpdateUserDtoV2 } from '@modules/users/dtos/update-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateTeachersDto extends UpdateUserDtoV2 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Mã giáo viên', example: 'GV001' })
  code: string

  // đặc cách giáo viên
  @IsOptional()
  @IsEnum(TeacherSpecial)
  @ApiPropertyOptional({ description: 'Đặc cách giáo viên', enum: TeacherSpecial, example: TeacherSpecial.LV1 })
  special: TeacherSpecial

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên khác (GM, LM, TS, ThS,...)' })
  other_name: string

  // học vị
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Học vị (Cử nhân, Thạc sĩ, Tiến sĩ,...)' })
  degree: string

  // chuyên ngành
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Chuyên ngành' })
  specialized: string

  // chứng chỉ chuyên môn
  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'Chứng chỉ chuyên môn',
    example: [
      { name: 'Chứng chỉ 1', path: 'path/to/file' },
      { name: 'Chứng chỉ 2', path: 'path/to/file' },
    ],
  })
  professional_certificate: IFile[]

  // chứng chỉ giáo viên
  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'Chứng chỉ giáo viên',
    example: [
      { name: 'Chứng chỉ 1', path: 'path/to/file' },
      { name: 'Chứng chỉ 2', path: 'path/to/file' },
    ],
  })
  teacher_certificate: IFile[]

  // chứng chỉ khác
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ description: 'Chứng chỉ khác', example: ['Chứng chỉ 1', 'Chứng chỉ 2'] })
  other_certificate: string[]

  // môn đã và đang giảng dạy
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ description: 'Môn đã và đang giảng dạy', example: ['Toán', 'Văn'] })
  subject_teaching: string[]

  // GV nội trú hay ngoại trú (true: nội trú, false: ngoại trú)
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'GV nội trú hay ngoại trú (true: nội trú, false: ngoại trú)' })
  boarding: boolean

  // ngày bắt đầu làm việc
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Ngày bắt đầu làm việc' })
  start_date: string

  // CV
  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'pdf file CV',
    example: [
      { name: 'cv1.pdf', path: 'path/to/file' },
      { name: 'cv2.pdf', path: 'path/to/file' },
    ],
  })
  cv: IFile[]

  // banking
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên ngân hàng' })
  bank_name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng' })
  bank_account_number: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên chủ tài khoản ngân hàng' })
  bank_account_name: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Chi nhánh ngân hàng' })
  bank_branch: string
}
