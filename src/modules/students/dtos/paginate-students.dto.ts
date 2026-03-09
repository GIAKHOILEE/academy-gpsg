import { PaginationDto } from '@common/pagination'
import { ClassStatus } from '@enums/class.enum'
import { Gender } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { StudentCardStatus } from '@enums/user.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator'

export class PaginateStudentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên sinh viên' })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Họ sinh viên' })
  first_name?: string

  @IsOptional()
  @IsEnum(Gender)
  @ApiPropertyOptional({ description: 'Giới tính:: 0: other, 1: male, 2: female', enum: Gender })
  @Type(() => Number)
  gender?: Gender

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã sinh viên' })
  code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Email' })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Số điện thoại' })
  phone_number?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Trạng thái 1: active, 2: inactive', enum: UserStatus })
  status?: UserStatus

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã thẻ của học viên' })
  card_code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên lớp' })
  class_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mã lớp' })
  class_code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ID lớp' })
  class_id?: number

  @IsOptional()
  @ApiPropertyOptional({ description: 'Trạng thái lớp', example: ClassStatus.ENROLLING, enum: ClassStatus })
  @IsEnum(ClassStatus)
  @Type(() => Number)
  class_status?: ClassStatus

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ID học kỳ' })
  semester_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ID khoa' })
  department_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ID niên khóa' })
  scholastic_id?: number

  @IsOptional()
  @IsEnum(StudentCardStatus)
  @ApiPropertyOptional({ description: 'Trạng thái thẻ', enum: StudentCardStatus, example: StudentCardStatus.NOT_PRINTED })
  @Type(() => Number)
  card_status?: StudentCardStatus
}
