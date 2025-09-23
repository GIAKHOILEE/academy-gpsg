import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'
export class DashboardDto {
  totalBorrow: number
}

export class FilterDashboardDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo ngày bắt đầu mượn', example: '2025-01-01' })
  from_date: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'filter theo ngày kết thúc mượn', example: '2025-05-30' })
  to_date: string

  // @ApiPropertyOptional({ description: 'Filter theo trạng thái', enum: BorrowStatus, example: 'not_returned' })
  // @IsEnum(BorrowStatus)
  // @IsOptional()
  // status?: BorrowStatus
}

export class RevenueStatisticsDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Từ ngày', example: '2025-01-01' })
  start_date: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Đến ngày', example: '2025-05-30' })
  end_date: string
}

export class SemesterRevenueDto {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Học kỳ', example: 1 })
  @Type(() => Number)
  semester_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Niên khóa', example: 1 })
  @Type(() => Number)
  scholastic_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Khoa', example: 1 })
  @Type(() => Number)
  department_id: number
}
