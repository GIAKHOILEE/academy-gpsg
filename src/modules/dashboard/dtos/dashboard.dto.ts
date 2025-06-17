import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
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
