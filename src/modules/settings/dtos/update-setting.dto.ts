import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateSettingDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Bật tắt lượng giá', example: false })
  is_evaluate: boolean
}
