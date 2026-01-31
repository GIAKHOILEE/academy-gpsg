import { PaginationDto } from '@common/pagination'
import { FinancesPaymentMethod, FinancesType } from '@enums/finances.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

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
  @ApiPropertyOptional({ description: 'Payment method', enum: FinancesPaymentMethod })
  payment_method?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Day' })
  day?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Month' })
  month?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Year' })
  year?: string

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
}
