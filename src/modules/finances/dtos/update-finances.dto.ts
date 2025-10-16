import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateFinancesDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Name of the finances', example: 'Salary' })
  name: string

  @IsEnum(FinancesType)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Type of the finances', example: FinancesType.GENERAL, enum: FinancesType })
  type: FinancesType

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Amount received', example: 1000000 })
  amount_received: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Amount spent', example: 1000000 })
  amount_spent: number

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Statement', example: true })
  statement: boolean

  @IsEnum(FinancesPaymentMethod)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Payment method', example: FinancesPaymentMethod.CASH, enum: FinancesPaymentMethod })
  payment_method: FinancesPaymentMethod

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Day', example: '2025-01-01' })
  day: string
}
