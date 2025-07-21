import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdatePostCatalogDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'string', description: 'Ten danh muc' })
  name: string

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1, description: 'Id danh muc cha' })
  parent_id: number

  index: number

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'string', description: 'Icon' })
  icon: string
}
