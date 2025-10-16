import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateFinancesDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Name of the finances', example: 'Salary' })
  name: string

  @IsEnum(FinancesType)
  @IsNotEmpty()
  @ApiProperty({ description: 'Type of the finances', example: FinancesType.GENERAL, enum: FinancesType })
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
  @IsNotEmpty()
  @ApiProperty({ description: 'Statement', example: true })
  statement: boolean

  @IsEnum(FinancesPaymentMethod)
  @IsNotEmpty()
  @ApiProperty({ description: 'Payment method', example: FinancesPaymentMethod.CASH, enum: FinancesPaymentMethod })
  payment_method: FinancesPaymentMethod

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Day', example: '2025-01-01' })
  day: string
}
