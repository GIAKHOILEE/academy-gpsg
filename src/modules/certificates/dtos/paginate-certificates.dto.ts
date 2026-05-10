import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateCertificatesDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Tên sinh viên', example: 'Hoàng Phi Khanh Pro' })
  full_name: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Ngày sinh (Định dạng: DD/MM/YYYY)', example: '11/06/2025' })
  birth_date: string
}
