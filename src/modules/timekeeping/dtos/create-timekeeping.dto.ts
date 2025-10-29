import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateTimekeepingDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Tên nhân viên' })
  name: string

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Năm' })
  year: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Tháng' })
  month: number

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({ description: 'Danh sách giờ làm việc mỗi ngày', type: [Number], example: [1, 2, 2, 2, 0, null, null, 0, 0, 2, 4] })
  days: number[]

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Phụ cấp' })
  allowance: number

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Lương/giờ' })
  salary_per_hour: number

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú' })
  note?: string
}
