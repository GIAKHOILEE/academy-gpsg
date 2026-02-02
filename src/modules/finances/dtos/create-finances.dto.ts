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

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Day', example: 1 })
  day: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Month', example: 1 })
  month: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Year', example: 2025 })
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
