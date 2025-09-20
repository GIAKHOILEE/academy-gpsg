import { RuleType } from '@enums/class.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateClassRulesDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'ID lớp', example: 1 })
  class_id: number

  @IsOptional()
  @IsEnum(RuleType)
  @ApiPropertyOptional({ description: 'Loại quy tắc', enum: RuleType, example: RuleType.ATTENDANCE_PERCENTAGE })
  type: RuleType

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Ngưỡng yêu cầu', example: 0.8 })
  attendance_percent: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Ngưỡng yêu cầu', example: 40 })
  score: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mô tả', example: 'Quy tắc đánh giá' })
  description: string
}
