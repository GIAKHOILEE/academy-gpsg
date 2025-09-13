import { RuleType } from '@enums/class.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional } from 'class-validator'

export class CreateClassRulesDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID lớp', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsEnum(RuleType)
  @ApiProperty({ description: 'Loại quy tắc', enum: RuleType, example: RuleType.ATTENDANCE_PERCENTAGE })
  type: RuleType

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Ngưỡng yêu cầu', example: 0.8 })
  attendance_percent: number

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ description: 'Ngưỡng yêu cầu', example: 80 })
  score: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Mô tả', example: 'Quy tắc đánh giá' })
  description: string
}
