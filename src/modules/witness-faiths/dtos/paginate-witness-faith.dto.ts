import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginateWitnessFaithDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'The witness faith menu id',
    example: 1,
  })
  @Type(() => Number)
  witness_faith_menu_id: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the witness faith',
    example: 'John Doe',
  })
  name: string
}
