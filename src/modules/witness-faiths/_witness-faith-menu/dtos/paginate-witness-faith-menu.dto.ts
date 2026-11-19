import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateWitnessFaithMenuDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'The name of the witness faith menu',
    example: 'Witness Faith Menu',
  })
  @IsOptional()
  @Trim()
  @IsString()
  name: string
}
