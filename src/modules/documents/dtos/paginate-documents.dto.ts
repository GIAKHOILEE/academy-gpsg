import { PaginationDto } from '@common/pagination'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateDocumentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Batch code of the document' })
  batch_code?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the document' })
  name?: string
}

export class PaginateDocumentOrderDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the document' })
  name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Batch code of the document' })
  batch_code?: string
}
