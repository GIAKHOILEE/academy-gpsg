import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class UpdateCertificatesDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image_url: string
}
