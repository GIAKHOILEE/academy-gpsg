import { PaginationDto } from '@common/pagination'
import { Trim } from '@decorators/trim.decorator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class PaginateDocumentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Batch code of the document' })
  batch_code?: string

  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the document' })
  name?: string
}

export class PaginateDocumentOrderDto extends PaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the document' })
  name?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Batch code of the document' })
  batch_code?: string
}
