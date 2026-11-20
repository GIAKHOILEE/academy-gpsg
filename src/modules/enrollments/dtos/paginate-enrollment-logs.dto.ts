import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { EnrollmentLogAction, EnrollmentLogActorType } from '@enums/enrollment-log.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator'

export class PaginateEnrollmentLogsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Lọc theo ID đơn đăng ký (kể cả đơn đã xóa cứng)' })
  enrollment_id?: number

  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Lọc theo mã đơn đăng ký' })
  enrollment_code?: string

  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã đơn, tên học viên, mã học viên, người thao tác hoặc nguyên nhân (reason)' })
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Lọc theo ID người thao tác' })
  actor_id?: number

  @IsOptional()
  @IsEnum(EnrollmentLogActorType)
  @ApiPropertyOptional({ description: 'Loại tác nhân thao tác', enum: EnrollmentLogActorType })
  actor_type?: EnrollmentLogActorType

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Lọc theo hành động (một giá trị hoặc nhiều giá trị cách nhau bởi dấu phẩy, vd: UPDATE,RESTORE,DELETE)',
    example: 'DELETE',
  })
  action?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'boolean') return value
    return String(value).toLowerCase() === 'true'
  })
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Chỉ lấy log của các đơn đã bị xóa cứng (không còn trong bảng enrollments)' })
  only_hard_deleted?: boolean

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD hoặc ISO string)', example: '2026-01-01' })
  from_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD hoặc ISO string)', example: '2026-12-31' })
  to_date?: string
}

export class PaginateSingleEnrollmentLogsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Lọc theo ID người thao tác' })
  actor_id?: number

  @IsOptional()
  @IsEnum(EnrollmentLogActorType)
  @ApiPropertyOptional({ description: 'Loại tác nhân thao tác', enum: EnrollmentLogActorType })
  actor_type?: EnrollmentLogActorType

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Lọc theo hành động (một giá trị hoặc nhiều giá trị cách nhau bởi dấu phẩy)',
    enum: EnrollmentLogAction,
  })
  action?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD hoặc ISO string)' })
  from_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD hoặc ISO string)' })
  to_date?: string
}
