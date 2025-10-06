import { PaginationDto } from '@common/pagination'
import { UserStatus } from '@enums/status.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateTeachersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên giáo viên' })
  full_name?: string

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
}
