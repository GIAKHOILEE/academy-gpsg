import { CreateUserDtoV2 } from '@modules/users/dtos/create-user.dto'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateTeachersDto extends CreateUserDtoV2 {
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
  @IsString()
  @ApiPropertyOptional({ description: 'Chứng chỉ chuyên môn' })
  professional_certificate: string

  // chứng chỉ giáo viên
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Chứng chỉ giáo viên' })
  teacher_certificate: string

  // môn đã và đang giảng dạy
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Môn đã và đang giảng dạy' })
  subject_teaching: string

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
  @IsString()
  @ApiPropertyOptional({ description: 'pdf file CV' })
  cv: string
}
