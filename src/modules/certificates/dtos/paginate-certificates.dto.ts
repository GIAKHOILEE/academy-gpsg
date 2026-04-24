import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class PaginateCertificatesDto {
  @IsString()
  @ApiProperty({ description: 'Tên sinh viên', example: 'Hoàng Phi Khanh Pro' })
  full_name: string

  @IsString()
  @ApiProperty({ description: 'Ngày sinh (Định dạng: DD/MM/YYYY)', example: '11/06/2025' })
  birth_date: string
}
