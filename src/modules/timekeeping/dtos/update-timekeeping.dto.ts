import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateTimekeepingDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Tên nhân viên' })
  name?: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Năm' })
  year?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Tháng' })
  month?: number

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'Danh sách giờ làm việc mỗi ngày', type: [Number], example: [1, 2, 2, 2, 0, null, null, 0, 0, 2, 4] })
  days?: number[]

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Phụ cấp' })
  allowance?: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Lương/giờ' })
  salary_per_hour?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Ghi chú' })
  note?: string
}
