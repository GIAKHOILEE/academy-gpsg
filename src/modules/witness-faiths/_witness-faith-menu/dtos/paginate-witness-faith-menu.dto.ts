import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateWitnessFaithMenuDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'The name of the witness faith menu',
    example: 'Witness Faith Menu',
  })
  @IsOptional()
  @IsString()
  name: string
}
