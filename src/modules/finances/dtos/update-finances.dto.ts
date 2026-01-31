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

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Day', example: 1 })
  day: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Month', example: 1 })
  month: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Year', example: 2025 })
  year: number

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Note', example: 'Note' })
  note: string

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Scholastic ID', example: 1 })
  scholastic_id: number

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Semester ID', example: 1 })
  semester_id: number
}
