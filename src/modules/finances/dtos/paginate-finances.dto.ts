import { PaginationDto } from '@common/pagination'
import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBooleanString, IsOptional, IsString } from 'class-validator'

export class PaginateFinancesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the finances' })
  name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Type of the finances', enum: FinancesType })
  type?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Day of the finances', example: '20' })
  day?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Month of the finances', example: '03' })
  month?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Year of the finances', example: '2026' })
  year?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Payment method', enum: FinancesPaymentMethod })
  payment_method?: string

  @IsOptional()
  @IsBooleanString()
  @ApiPropertyOptional({ description: 'filter theo sao kê', example: true, type: Boolean })
  statement?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Note' })
  note?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Scholastic ID' })
  scholastic_id?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Semester ID' })
  semester_id?: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Start day (YYYY-MM-DD)' })
  start_day?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'End day (YYYY-MM-DD)' })
  end_day?: string
}
