import { PaginationDto } from '@common/pagination'
import { AnnouncementStatus, AnnouncementType } from '@enums/announcement.enum'
import { Role } from '@enums/role.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateAnnouncementStationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AnnouncementType)
  @ApiPropertyOptional({
    description: 'Lọc theo loại thông báo: email, sms, zalo',
    enum: AnnouncementType,
  })
  type?: AnnouncementType

  @IsOptional()
  @IsEnum(AnnouncementStatus)
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái gửi: PENDING, PROCESSING, SUBMITTED, FAILED, UNKNOWN',
    enum: AnnouncementStatus,
  })
  status?: AnnouncementStatus

  @IsOptional()
  @IsEnum(Role)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Lọc theo vai trò người nhận (2: STUDENT, 3: TEACHER)',
    enum: Role,
  })
  role?: Role

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tiêu đề thông báo',
  })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo nội dung thông báo',
  })
  content?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo email người nhận',
  })
  email?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo số điện thoại người nhận',
  })
  phone_number?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Lọc theo ID của Student hoặc Teacher (target_id)',
  })
  target_id?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Lọc theo ID của User (user_id)',
  })
  user_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Lọc theo mã SMS Job UID (sms_job_uid)',
  })
  sms_job_uid?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo họ tên người nhận',
  })
  full_name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Lọc từ ngày tạo (YYYY-MM-DD hoặc ISO Date)',
    example: '2026-01-01',
  })
  from_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Lọc đến ngày tạo (YYYY-MM-DD hoặc ISO Date)',
    example: '2026-12-31',
  })
  to_date?: string
}

